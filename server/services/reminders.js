// server/services/reminders.js — appointment reminders with a pluggable delivery
// provider. No gateway account? The default 'console' provider logs the message
// (honest demo behaviour) and the clinic still records the reminder as sent.
// Set REMINDER_WEBHOOK_URL to POST to your own SMS/email/WhatsApp relay instead.
'use strict';
const { db, localDay } = require('../db/connection');
const { httpErr } = require('../middleware/auth');
const { push } = require('./notify');

const PROVIDER = process.env.REMINDER_WEBHOOK_URL ? 'webhook' : 'console';
const INS = db.prepare(`INSERT INTO reminders(appointment_id,patient_id,patient_name,phone,email,channel,kind,message,send_at,status)
  VALUES (?,?,?,?,?,?,?,?,?,'pending')`);

// generate: every scheduled visit inside the next 24h gets ONE reminder_24h row,
// and public bookings get an instant confirmation (pending, due immediately).
function generate() {
  const created = [];
  const due = db.prepare(`SELECT a.id,a.patient_id,a.patient_name,a.patient_phone,a.email,a.appointment_date,a.start_time
    FROM appointments a
    WHERE a.status='scheduled' AND a.appointment_date BETWEEN ? AND ?`).all(localDay(0), localDay(1));
  const ins = db.prepare(`SELECT 1 x FROM reminders WHERE appointment_id=? AND kind='reminder_24h' AND status!='skipped'`);
  for (const a of due) {
    if (ins.get(a.id)) continue;
    // send 24h before the visit; if that moment has passed, it goes out on the next run
    const sendAt = subtractDay(a.appointment_date) + ' ' + a.start_time;
    const when = sendAt <= nowStamp() ? nowStamp() : sendAt;
    INS.run(a.id, a.patient_id, a.patient_name || 'Patient', a.patient_phone, a.email,
      a.email ? 'email' : 'sms', 'reminder_24h',
      `Reminder from DentEra: your appointment is on ${a.appointment_date} at ${a.start_time}. ` +
      `Call the clinic to reschedule.`, when);
    created.push(a.id);
  }
  return created;
}

// confirm public bookings (driven by the booking route itself)
function confirmPublicBooking(appointmentId) {
  const a = db.prepare('SELECT * FROM appointments WHERE id=? AND source=?').get(+appointmentId, 'public');
  if (!a) return null;
  INS.run(a.id, a.patient_id, a.patient_name || 'Patient', a.patient_phone, a.email,
    a.email ? 'email' : 'sms', 'confirmation',
    `Your DentEra appointment on ${a.appointment_date} at ${a.start_time} is confirmed. ` +
    `Please arrive 10 minutes early.`, nowStamp());
  return a.id;
}

// send everything due (max 20 per run — the loop keeps the rest for the next tick)
async function runDue({ limit = 20 } = {}) {
  const due = db.prepare(`SELECT * FROM reminders WHERE status='pending' AND send_at<=?
    ORDER BY send_at LIMIT ?`).all(nowStamp(), limit);
  let sent = 0;
  for (const r of due) {
    try {
      await deliver(r);
      db.prepare("UPDATE reminders SET status='sent', sent_at=datetime('now'), provider=?, error=NULL WHERE id=?")
        .run(PROVIDER, r.id);
      sent++;
    } catch (e) {
      db.prepare("UPDATE reminders SET status='failed', provider=?, error=? WHERE id=?")
        .run(PROVIDER, String(e.message || 'send failed').slice(0, 200), r.id);
    }
  }
  if (sent) push({ audience: 'staff', kind: 'reminders', title: `${sent} reminder${sent === 1 ? '' : 's'} sent`,
    body: 'Appointment confirmations and 24-hour nudges went out.', link: '#/admin' });
  return { sent, checked: due.length };
}

async function deliver(r) {
  const text = r.message;
  if (PROVIDER === 'webhook') {
    const res = await fetch(process.env.REMINDER_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: r.email || r.phone, channel: r.channel, kind: r.kind, message: text, appointment_id: r.appointment_id })
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
    return;
  }
  // console provider — the honest default when no gateway is configured
  console.log(`[reminder→${r.channel}] ${r.email || r.phone}: ${text}`);
}

function list({ status, limit = 50 } = {}) {
  return status
    ? db.prepare(`SELECT r.*, u.name AS dentist_name FROM reminders r
        LEFT JOIN appointments a ON a.id=r.appointment_id
        LEFT JOIN dentists d ON d.id=a.dentist_id LEFT JOIN users u ON u.id=d.user_id
        WHERE r.status=? ORDER BY r.id DESC LIMIT ?`).all(status, limit)
    : db.prepare(`SELECT r.*, u.name AS dentist_name FROM reminders r
        LEFT JOIN appointments a ON a.id=r.appointment_id
        LEFT JOIN dentists d ON d.id=a.dentist_id LEFT JOIN users u ON u.id=d.user_id
        ORDER BY r.id DESC LIMIT ?`).all(limit);
}

function setStatus(id, status) {
  if (!['skipped', 'pending'].includes(status)) throw httpErr(400, 'BAD_REQUEST', 'Reminders can be skipped or re-opened.');
  return db.prepare('UPDATE reminders SET status=? WHERE id=?').run(status, +id).changes;
}

// one custom reminder (front desk asks for a follow-up nudge)
function create(u, b = {}) {
  const message = String(b.message || '').trim().slice(0, 300);
  if (!message) throw httpErr(400, 'BAD_REQUEST', 'Write the reminder message.');
  const sendAt = /^\d{4}-\d{2}-\d{2}$/.test(b.send_at || '') ? `${b.send_at} ${/^\d{2}:\d{2}$/.test(b.send_time || '') ? b.send_time : '09:00'}` : nowStamp();
  const id = db.prepare(`INSERT INTO reminders(patient_id,patient_name,phone,email,channel,kind,message,send_at,status,created_by)
    VALUES (?,?,?,?,?, 'custom', ?, ?, 'pending', ?)`)
    .run(b.patient_id ? +b.patient_id : null, String(b.patient_name || '').slice(0, 120) || null,
      String(b.phone || '').slice(0, 20) || null, String(b.email || '').slice(0, 120) || null,
      ['sms', 'email', 'whatsapp'].includes(b.channel) ? b.channel : 'sms', message, sendAt, u.sub).lastInsertRowid;
  return { id };
}

// ---------- date helpers (local, never toISOString for day math) ----------
const pad2 = n => String(n).padStart(2, '0');
const nowStamp = () => { const d = new Date(); return `${localDay(0)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const subtractDay = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso; const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };

module.exports = { generate, runDue, confirmPublicBooking, list, setStatus, create, PROVIDER };
