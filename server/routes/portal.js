// server/routes/portal.js — the patient portal: an authenticated patient sees their
// own appointments, invoices, chart and documents, can book/cancel and pay.
// Sign-in is phone + date of birth (no password to forget); the JWT carries {patientId}
// and every query is scoped to it — identity NEVER comes from the body.
// Two routers are exported (app.use takes an array): public = login/logout, the rest
// carries the patient guard. A bare router.use guard would run for every /api call.
'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');
const { db, localDay } = require('../db/connection');
const { JWT_SECRET, TOKEN_TTL_S, httpErr } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const { audit } = require('../services/audit');
const { push, list: notifyList, unreadCount, markRead, markAllRead } = require('../services/notify');
const money = require('../services/money');
const clinical = require('../services/clinical');
const { slotClash } = require('../services/tools');

const pub = express.Router();  // login / logout (no session yet)
const router = express.Router(); // everything below needs the patient JWT
const last10 = p => (String(p).match(/\d/g) || []).join('').slice(-10);

// patient sign-in throttle: 5 tries / 10 min per IP (same counter style as public booking)
const tries = new Map();
const W = 10 * 60 * 1000;
const ipOf = req => String((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
function limited(req) {
  const now = Date.now(), ip = ipOf(req);
  const hit = (tries.get(ip) || []).filter(ts => now - ts < W);
  tries.set(ip, hit);
  return hit.length >= 5;
}
const note = req => tries.set(ipOf(req), (tries.get(ipOf(req)) || []).concat(Date.now()));

// attach the patient identity (JWT cookie or Bearer)
function patientAuth(req) {
  const raw = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    || (/dent_token=([^;]*)/.exec(req.headers.cookie || '') || [])[1] || '';
  if (!raw) throw httpErr(401, 'AUTH_REQUIRED', 'Please sign in to see your records.');
  let u;
  try { u = jwt.verify(raw, JWT_SECRET); } catch { throw httpErr(401, 'AUTH_REQUIRED', 'Your session expired — please sign in again.'); }
  if (u.role !== 'patient' || !u.patientId) throw httpErr(403, 'FORBIDDEN', 'This area is for patients only.');
  const patient = db.prepare('SELECT id,name,dob,phone,gender,medical_notes FROM patients WHERE id=?').get(u.patientId);
  if (!patient) throw httpErr(404, 'NOT_FOUND', 'Patient record not found.');
  return { sub: u.sub, patientId: patient.id, patient };
}

pub.post('/portal/login', h((req, res, reqId) => {
  if (limited(req)) return res.status(429).json({ ok: false, error: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Please wait a few minutes and try again.' });
  note(req);
  const phone = String((req.body || {}).phone || '').trim();
  const dob = String((req.body || {}).dob || '').trim();
  const digits = last10(phone);
  if (digits.length < 7) throw httpErr(400, 'BAD_REQUEST', 'Please enter the phone number the clinic has on file.');
  // the clinic files both "+91 98100 12345" and "9810012345" — match the last 10 digits
  const row = db.prepare(`SELECT id,name,dob,phone FROM patients
    WHERE replace(replace(phone,'-',''),' ','') LIKE ? LIMIT 1`).get(`%${digits}`);
  if (!row) { audit(null, null, 'portal_login_failed', null, reqId, false, digits, 'portal', null);
    throw httpErr(401, 'BAD_CREDENTIALS', 'No patient found with that phone number. Please call the clinic.'); }
  if (row.dob && dob && row.dob !== dob) {
    audit(row.id, null, 'portal_login_failed', null, reqId, false, null, 'portal', row.id);
    throw httpErr(401, 'BAD_CREDENTIALS', 'The date of birth does not match our records.');
  }
  // one portal account per patient (idempotent): email is a placeholder, login is phone-based
  let user = db.prepare('SELECT * FROM users WHERE role=? AND patient_id=?').get('patient', row.id);
  if (!user) {
    const email = `patient-${row.id}@portal.local`;
    user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (user) db.prepare("UPDATE users SET role='patient', patient_id=? WHERE id=?").run(row.id, user.id);
    else user = { id: db.prepare('INSERT INTO users(name,role,email,patient_id) VALUES (?,?,?,?)')
      .run(row.name, 'patient', email, row.id).lastInsertRowid };
  }
  const token = jwt.sign({ sub: user.id, role: 'patient', patientId: row.id, name: row.name }, JWT_SECRET, { expiresIn: TOKEN_TTL_S });
  audit(user.id, null, 'portal_login', null, reqId, true, null, 'portal', row.id);
  const isTLS = !!req.secure || /^https/i.test(String(req.headers['x-forwarded-proto'] || ''));
  res.cookie('dent_token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: TOKEN_TTL_S * 1000, secure: isTLS });
  return res.json({ ok: true, token, patient: { id: row.id, name: row.name, dob: row.dob, phone: row.phone, medical_notes: row.medical_notes } });
}));

pub.post('/portal/logout', h((req, res) => res.clearCookie('dent_token', { path: '/' }).json({ ok: true })));

// patient identity guard — scoped to /portal so it never runs for other /api routes
router.use('/portal', (req, res, next) => {
  try { req.patient = patientAuth(req); next(); }
  catch (e) { res.status(e.status || 401).json({ ok: false, error: e.err || 'AUTH_REQUIRED', message: e.message }); }
});

const P = req => req.patient.patientId;

router.get('/portal/me', h((req, res) => {
  res.json({ ok: true, data: req.patient.patient });
}));

router.get('/portal/appointments', h((req, res) => {
  const rows = db.prepare(`SELECT a.id,a.appointment_date,a.start_time,a.end_time,a.status,a.reason,a.source,
      u.name AS dentist, d.specialty
    FROM appointments a JOIN dentists d ON d.id=a.dentist_id JOIN users u ON u.id=d.user_id
    WHERE a.patient_id=? AND a.status!='cancelled' ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 50`).all(P(req));
  res.json({ ok: true, data: rows });
}));

router.get('/portal/invoices', h((req, res) => {
  res.json({ ok: true, data: money.listInvoices({ role: 'patient' }, { patient_id: P(req) }) });
}));

router.get('/portal/chart', h((req, res) => {
  const patient = req.patient.patient;
  const records = db.prepare(`SELECT t.id,t.tooth_fdi,t.tooth_status,t.condition,t.visit_date,t.cost,t.notes,
      tr.name AS treatment_name FROM tooth_records t LEFT JOIN treatments tr ON tr.id=t.treatment_id
    WHERE t.patient_id=? ORDER BY t.id`).all(P(req));
  res.json({ ok: true, data: { patient, records } });
}));

router.get('/portal/plans', h((req, res) => {
  res.json({ ok: true, data: db.prepare('SELECT id,title,status,total_estimate FROM treatment_plans WHERE patient_id=? ORDER BY id DESC').all(P(req)) });
}));

router.get('/portal/documents', h((req, res) => {
  res.json({ ok: true, data: clinical.listDocuments({ role: 'admin' }, P(req)) });
}));

// book one of my own visits (still clash-checked, still bounded to the next 14 days)
router.post('/portal/appointments', h((req, res, reqId) => {
  const b = req.body || {};
  const dentistId = +b.dentist_id, date = String(b.date || ''), time = String(b.time || '');
  if (!dentistId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw httpErr(400, 'BAD_REQUEST', 'Please choose a dentist, a date and a time.');
  if (date < localDay(0) || date > localDay(14)) throw httpErr(400, 'BAD_REQUEST', 'Please pick a date within the next 14 days.');
  if (!db.prepare('SELECT id FROM dentists WHERE id=?').get(dentistId)) throw httpErr(404, 'NOT_FOUND', 'Unknown dentist.');
  const end = require('../services/tools').addMin(time, 30);
  if (slotClash(dentistId, date, time, end)) throw httpErr(409, 'SLOT_TAKEN', 'That slot was just taken — please pick another.');
  const id = db.prepare(`INSERT INTO appointments(dentist_id,patient_id,patient_name,appointment_date,start_time,end_time,status,reason,source)
    VALUES (?,?,?,?,?,?,'scheduled',?,'public')`)
    .run(dentistId, P(req), req.patient.patient.name, date, time, end,
      String(b.reason || 'Consultation').slice(0, 200)).lastInsertRowid;
  audit(req.patient.sub, null, 'portal_booking', null, reqId, true, date + ' ' + time, 'appointments', id);
  push({ audience: 'staff', kind: 'portal_booking', title: `New portal booking — ${req.patient.patient.name}`,
    body: `${date} at ${time}`, link: '#/admin' });
  res.status(201).json({ ok: true, data: { id, date, time } });
}));

router.post('/portal/appointments/:id/cancel', h((req, res, reqId) => {
  const r = db.prepare(`UPDATE appointments SET status='cancelled', updated_at=datetime('now')
    WHERE id=? AND patient_id=?`).run(+req.params.id, P(req));
  if (!r.changes) throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
  audit(req.patient.sub, null, 'portal_cancel', null, reqId, true, null, 'appointments', +req.params.id);
  res.json({ ok: true, data: { cancelled: true, id: +req.params.id } });
}));

// pay an invoice of mine (method + reference recorded on the payment row)
router.post('/portal/invoices/:id/payments', h((req, res, reqId) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(+req.params.id);
  if (!inv || inv.patient_id !== P(req)) throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
  const out = money.recordPayment({ role: 'patient', sub: req.patient.sub, dentistId: null },
    { invoice_id: inv.id, ...(req.body || {}) });
  audit(req.patient.sub, null, 'portal_payment', null, reqId, true, `₹${out.amount} via ${out.method}`, 'invoices', inv.id);
  res.status(201).json({ ok: true, data: out });
}));

// patient-facing notifications (confirmations, reminders) + unread badge
router.get('/portal/notifications', h((req, res) => {
  const scope = { audience: 'patient', userId: req.patient.sub };
  res.json({ ok: true, data: notifyList(scope), unread: unreadCount(scope) });
}));

router.post('/portal/notifications/read', h((req, res) => {
  const { id } = req.body || {};
  if (id) markRead(+id); else markAllRead({ audience: 'patient', userId: req.patient.sub });
  res.json({ ok: true });
}));

module.exports = [pub, router];
