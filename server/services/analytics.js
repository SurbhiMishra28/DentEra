// server/services/analytics.js — the numbers a practice actually runs on:
// revenue trend, top treatments, per-dentist utilisation, no-show rate and the
// recall list (patients due for a check-up). Own-practice (dentist) or clinic-wide.
'use strict';
const { db, localDay } = require('../db/connection');
const { httpErr } = require('../middleware/auth');
const { assertPatientMine } = require('./tools');

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// dentists join so a dentist only sees their own rows
const scope = u => (u.role === 'dentist' ? `AND a.dentist_id=${u.dentistId}` : '');
const payScope = u => (u.role === 'dentist'
  ? `AND i.patient_id IN (SELECT patient_id FROM dentist_patients WHERE dentist_id=${u.dentistId})` : '');

function window_(from, to) {
  const f = /^\d{4}-\d{2}-\d{2}$/.test(from || '') ? from : localDay(-30);
  const t = /^\d{4}-\d{2}-\d{2}$/.test(to || '') ? to : localDay(0);
  return [f, t];
}

// daily series: appointments, completions, no-shows, revenue (cash basis)
function trend(u, { from, to } = {}) {
  const [f, t] = window_(from, to);
  const days = [];
  for (let d = new Date(f + 'T00:00:00'); iso(d) <= t; d.setDate(d.getDate() + 1)) days.push(iso(d));
  const s = scope(u);
  const appts = db.prepare(`SELECT appointment_date d, status, COUNT(*) c FROM appointments a
    WHERE appointment_date BETWEEN ? AND ? ${s} GROUP BY appointment_date, status`).all(f, t);
  const byDay = {};
  for (const a of appts) {
    const row = byDay[a.d] || (byDay[a.d] = { date: a.d, appointments: 0, completed: 0, no_show: 0, revenue: 0 });
    row.appointments += a.c;
    if (a.status === 'completed') row.completed += a.c;
    if (a.status === 'no_show') row.no_show += a.c;
  }
  const pays = db.prepare(`SELECT substr(p.created_at,1,10) d, SUM(p.amount) c FROM payments p
    JOIN invoices i ON i.id=p.invoice_id WHERE substr(p.created_at,1,10) BETWEEN ? AND ? ${payScope(u)}
    GROUP BY substr(p.created_at,1,10)`).all(f, t);
  for (const p of pays) {
    const row = byDay[p.d] || (byDay[p.d] = { date: p.d, appointments: 0, completed: 0, no_show: 0, revenue: 0 });
    row.revenue = p.c;
  }
  return days.map(d => byDay[d] || { date: d, appointments: 0, completed: 0, no_show: 0, revenue: 0 });
}

function topTreatments(u, { from, to, limit = 8 } = {}) {
  const [f, t] = window_(from, to);
  const own = u.role === 'dentist' ? `AND tr.dentist_id=${u.dentistId}` : '';
  return db.prepare(`SELECT t.name, COUNT(*) c, COALESCE(SUM(tr.cost),0) v
    FROM tooth_records tr JOIN treatments t ON t.id=tr.treatment_id
    WHERE tr.visit_date BETWEEN ? AND ? ${own}
    GROUP BY t.id ORDER BY c DESC LIMIT ?`).all(f, t, Math.min(limit, 20));
}

function utilization(u, { from, to } = {}) {
  const [f, t] = window_(from, to);
  const rows = db.prepare(`SELECT u.name dentist, COUNT(*) booked,
      SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END) completed,
      SUM(CASE WHEN a.status='no_show' THEN 1 ELSE 0 END) no_show
    FROM appointments a JOIN dentists d ON d.id=a.dentist_id JOIN users u ON u.id=d.user_id
    WHERE a.appointment_date BETWEEN ? AND ? ${u.role === 'dentist' ? 'AND a.dentist_id=' + u.dentistId : ''}
    GROUP BY a.dentist_id ORDER BY booked DESC`).all(f, t);
  return rows.map(r => ({ ...r, no_show_rate: r.booked ? Math.round((r.no_show / r.booked) * 100) : 0 }));
}

function noShowRate(u, { from, to } = {}) {
  const [f, t] = window_(from, to);
  const s = scope(u);
  const row = db.prepare(`SELECT COUNT(*) total, SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END) no_shows
    FROM appointments a WHERE appointment_date BETWEEN ? AND ? ${s}`).get(f, t);
  return { total: row.total, no_shows: row.no_shows || 0, rate: row.total ? Math.round(((row.no_shows || 0) / row.total) * 100) : 0 };
}

// patients due for a recall: last completed visit older than `months` (or never seen)
function recall(u, { months = 6, limit = 50 } = {}) {
  const s = u.role === 'dentist' ? 'AND dp.dentist_id=' + u.dentistId : '';
  const cutoff = (() => { const d = new Date(); d.setMonth(d.getMonth() - Math.min(24, Math.max(1, +months || 6))); return iso(d); })();
  const rows = db.prepare(`SELECT p.id, p.name, p.phone,
      (SELECT MAX(a2.appointment_date) FROM appointments a2 WHERE a2.patient_id=p.id AND a2.status='completed') AS last_visit,
      (SELECT COUNT(*) FROM appointments a3 WHERE a3.patient_id=p.id) AS visits
    FROM patients p JOIN dentist_patients dp ON dp.patient_id=p.id
    WHERE 1=1 ${s}
    GROUP BY p.id HAVING last_visit IS NULL OR last_visit <= ?
    ORDER BY last_visit IS NULL DESC, last_visit ASC LIMIT ?`).all(cutoff, Math.min(limit, 100));
  return rows.map(r => ({ ...r, due: !r.last_visit ? 'never-seen' : r.last_visit }));
}

// one-glance numbers for the dashboard hero row
function summary(u, { from, to } = {}) {
  const [f, t] = window_(from, to);
  const series = trend(u, { from: f, to: t });
  return {
    from: f, to: t,
    appointments: series.reduce((sum, d) => sum + d.appointments, 0),
    completed: series.reduce((sum, d) => sum + d.completed, 0),
    no_show: noShowRate(u, { from: f, to: t }),
    revenue_collected: db.prepare(`SELECT COALESCE(SUM(p.amount),0) c FROM payments p JOIN invoices i ON i.id=p.invoice_id
      WHERE substr(p.created_at,1,10) BETWEEN ? AND ? ${payScope(u)}`).get(f, t).c,
    outstanding: db.prepare(`SELECT COALESCE(SUM(i.amount-i.discount-i.paid_amount),0) c FROM invoices i
      WHERE i.status!='paid' ${payScope(u)}`).get().c,
    new_patients: (() => {
      const own = u.role === 'dentist'
        ? `AND p.id IN (SELECT patient_id FROM dentist_patients WHERE dentist_id=${u.dentistId})` : '';
      return db.prepare(`SELECT COUNT(*) c FROM patients p WHERE substr(p.created_at,1,10) BETWEEN ? AND ? ${own}`).get(f, t).c;
    })()
  };
}

module.exports = { trend, topTreatments, utilization, noShowRate, recall, summary };
