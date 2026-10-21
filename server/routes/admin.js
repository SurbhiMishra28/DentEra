// server/routes/admin.js — clinic-wide Admin Panel API (v1.2, additive).
// Role-gated: 'admin' + 'reception' only. READ-ONLY — invoice payments stay on
// /api/invoices (markInvoicePaid already allows non-dentist roles by design).
// Every query is parameterized; no patient data leaves dentist scoping here.
'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { db, localDay } = require('../db/connection');
const { requireAuth, requireRole, httpErr } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const { audit } = require('../services/audit');
const analytics = require('../services/analytics');
const reminders = require('../services/reminders');
const backup = require('../services/backup');
const money = require('../services/money');

const router = express.Router();

router.use((req, res, next) => {
  try { req.auth = requireRole('admin', 'reception')(requireAuth(req)); next(); }
  catch (e) { res.status(e.status || 401).json({ ok: false, error: e.err || 'AUTH_REQUIRED', message: e.message }); }
});

// KPI cards for the overview tab
router.get('/overview', h((req, res, reqId) => {
  const t0 = localDay(0), t7 = localDay(7);
  const one = (sql, ...args) => db.prepare(sql).get(...args).c;
  const data = {
    patients: one('SELECT COUNT(*) c FROM patients'),
    users: one('SELECT COUNT(*) c FROM users'),
    dentists: one('SELECT COUNT(*) c FROM dentists'),
    appts_today: one('SELECT COUNT(*) c FROM appointments WHERE appointment_date=?', t0),
    appts_week: one('SELECT COUNT(*) c FROM appointments WHERE appointment_date BETWEEN ? AND ?', t0, t7),
    plans_active: one("SELECT COUNT(*) c FROM treatment_plans WHERE status='active'"),
    public_bookings: one("SELECT COUNT(*) c FROM appointments WHERE source='public'"),
    unpaid: one("SELECT COUNT(*) c FROM invoices WHERE status!='paid'"),
    unpaid_due: db.prepare("SELECT COALESCE(SUM(amount-discount-paid_amount),0) c FROM invoices WHERE status!='paid'").get().c,
    treatments: one('SELECT COUNT(*) c FROM treatments')
  };
  audit(req.auth.sub, null, 'list', 'admin_overview', reqId, true, null, 'admin', null);
  res.json({ ok: true, data });
}));

// clinic-wide appointments for the next `days` days (default 7)
router.get('/appointments', h((req, res, reqId) => {
  const days = Math.min(Math.max(+req.query.days || 7, 1), 31);
  const rows = db.prepare(`
    SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.reason, a.source,
           a.patient_name, p.name AS registered_patient, u.name AS dentist
    FROM appointments a
    JOIN dentists dn ON dn.id = a.dentist_id
    JOIN users u ON u.id = dn.user_id
    LEFT JOIN patients p ON p.id = a.patient_id
    WHERE a.appointment_date BETWEEN ? AND ?
    ORDER BY a.appointment_date, a.start_time
    LIMIT 200`).all(localDay(0), localDay(days));
  audit(req.auth.sub, null, 'list', 'admin_appointments', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: rows });
}));

// all patients with their linked dentists + visit count
router.get('/patients', h((req, res, reqId) => {
  const rows = db.prepare(`
    SELECT p.id, p.name, p.phone, p.gender, p.medical_notes,
      (SELECT GROUP_CONCAT(DISTINCT u2.name) FROM dentist_patients dp
        JOIN dentists dn ON dn.id = dp.dentist_id JOIN users u2 ON u2.id = dn.user_id
        WHERE dp.patient_id = p.id) AS dentists,
      (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id) AS visits
    FROM patients p ORDER BY p.id LIMIT 200`).all();
  audit(req.auth.sub, null, 'list', 'admin_patients', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: rows });
}));

// last 40 assistant/audit events (who did what, when)
router.get('/audit', h((req, res, reqId) => {
  const rows = db.prepare(`
    SELECT aa.id, aa.action, aa.tool_name, aa.success, aa.detail, aa.created_at,
           u.name AS user
    FROM assistant_audit aa LEFT JOIN users u ON u.id = aa.user_id
    ORDER BY aa.id DESC LIMIT 40`).all();
  audit(req.auth.sub, null, 'list', 'admin_audit', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: rows });
}));

// ---------- dentists (list: admin + reception · add: admin only) ----------
router.get('/dentists', h((req, res, reqId) => {
  const rows = db.prepare(`
    SELECT d.id, d.specialty, d.room_no, u.name, u.email, u.created_at
    FROM dentists d JOIN users u ON u.id = d.user_id
    ORDER BY d.id`).all();
  audit(req.auth.sub, null, 'list', 'admin_dentists', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: rows });
}));

router.post('/dentists', h((req, res, reqId) => {
  if (req.auth.role !== 'admin') throw httpErr(403, 'FORBIDDEN', 'Only the clinic admin can add dentists.');
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').toLowerCase().trim();
  const password = String(b.password || '');
  const specialty = String(b.specialty || 'General Dentistry').trim().slice(0, 80) || 'General Dentistry';
  const room = String(b.room_no || '').trim().slice(0, 20) || null;
  if (!name) throw httpErr(400, 'BAD_REQUEST', 'A doctor name is required.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpErr(400, 'BAD_REQUEST', 'Please enter a valid email address for the doctor.');
  if (password.length < 6) throw httpErr(400, 'BAD_REQUEST', 'Please use a temporary password with at least 6 characters.');
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
    throw httpErr(409, 'EMAIL_TAKEN', 'That email already has an account.');
  const uid = db.prepare('INSERT INTO users(name,role,email,password_hash) VALUES (?,?,?,?)')
    .run(name, 'dentist', email, bcrypt.hashSync(password, 10)).lastInsertRowid;
  const did = db.prepare('INSERT INTO dentists(user_id,specialty,room_no) VALUES (?,?,?)').run(uid, specialty, room).lastInsertRowid;
  // default working week Mon–Fri 09:00–17:00 (the doctor's own schedule editor can change it)
  const insSch = db.prepare('INSERT INTO dentist_schedules(dentist_id,day_of_week,start_time,end_time) VALUES (?,?,?,?)');
  for (const dow of [1, 2, 3, 4, 5]) insSch.run(did, dow, '09:00', '17:00');
  audit(req.auth.sub, null, 'create', 'admin_dentists', reqId, true, name + ' <' + email + '>', 'admin', uid);
  res.status(201).json({ ok: true, data: { id: did, user_id: uid, name, email } });
}));

// ---------- staff (reception) accounts (v1.3) — admin only ----------
router.get('/staff', h((req, res, reqId) => {
  const rows = db.prepare(`SELECT id,name,email,created_at FROM users
    WHERE role='reception' ORDER BY id`).all();
  audit(req.auth.sub, null, 'list', 'admin_staff', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: rows });
}));

router.post('/staff', h((req, res, reqId) => {
  if (req.auth.role !== 'admin') throw httpErr(403, 'FORBIDDEN', 'Only the clinic admin can add staff.');
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').toLowerCase().trim();
  const password = String(b.password || '');
  if (!name) throw httpErr(400, 'BAD_REQUEST', 'A staff name is required.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpErr(400, 'BAD_REQUEST', 'Please enter a valid email address.');
  if (password.length < 6) throw httpErr(400, 'BAD_REQUEST', 'Please use a password with at least 6 characters.');
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
    throw httpErr(409, 'EMAIL_TAKEN', 'That email already has an account.');
  const uid = db.prepare('INSERT INTO users(name,role,email,password_hash) VALUES (?,?,?,?)')
    .run(name, 'reception', email, bcrypt.hashSync(password, 10)).lastInsertRowid;
  audit(req.auth.sub, null, 'create', 'admin_staff', reqId, true, name + ' <' + email + '>', 'admin', uid);
  res.status(201).json({ ok: true, data: { id: uid, name, email, role: 'reception' } });
}));

router.delete('/staff/:id', h((req, res, reqId) => {
  if (req.auth.role !== 'admin') throw httpErr(403, 'FORBIDDEN', 'Only the clinic admin can remove staff.');
  const row = db.prepare("SELECT id,name FROM users WHERE id=? AND role='reception'").get(+req.params.id);
  if (!row) throw httpErr(404, 'NOT_FOUND', 'No such staff account.');
  db.prepare('DELETE FROM conversations WHERE user_id=?').run(row.id);
  db.prepare('DELETE FROM users WHERE id=?').run(row.id);
  audit(req.auth.sub, null, 'delete', 'admin_staff', reqId, true, row.name, 'admin', row.id);
  res.json({ ok: true });
}));

// ---------- invoice print payload (receipt: invoice + patient + plan items) ----------
router.get('/invoices/:id', h((req, res, reqId) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(+req.params.id);
  if (!inv) throw httpErr(404, 'NOT_FOUND', 'No such invoice.');
  const patient = inv.patient_id
    ? db.prepare('SELECT name, phone FROM patients WHERE id=?').get(inv.patient_id) || null : null;
  const planRow = inv.plan_id
    ? db.prepare('SELECT title, dentist_id FROM treatment_plans WHERE id=?').get(inv.plan_id) || null : null;
  const items = planRow ? db.prepare(`SELECT pi.visit_no, pi.tooth_fdi, pi.cost, pi.status,
      t.name AS treatment_name
    FROM plan_items pi LEFT JOIN treatments t ON t.id = pi.treatment_id
    WHERE pi.plan_id=? ORDER BY pi.visit_no, pi.id`).all(inv.plan_id) : [];
  const dentist = planRow
    ? (db.prepare('SELECT u.name FROM dentists d JOIN users u ON u.id=d.user_id WHERE d.id=?').get(planRow.dentist_id) || {}).name || null
    : null;
  const due = Math.max(0, (inv.amount || 0) - (inv.discount || 0) - (inv.paid_amount || 0));
  audit(req.auth.sub, null, 'get', 'admin_invoice_print', reqId, true, null, 'admin', inv.id);
  res.json({ ok: true, data: { invoice: inv, patient, plan: planRow, items, dentist, due } });
}));

// ---------- analytics (clinic-wide, v1.3) ----------
const win = q => ({ from: q.from, to: q.to });
const clinicUser = req => ({ role: 'admin', dentistId: null, sub: req.auth.sub });

router.get('/analytics/summary', h((req, res, reqId) => {
  const out = analytics.summary(clinicUser(req), win(req.query));
  audit(req.auth.sub, null, 'list', 'admin_analytics_summary', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: out });
}));

router.get('/analytics/trend', h((req, res) => {
  res.json({ ok: true, data: analytics.trend(clinicUser(req), win(req.query)) });
}));

router.get('/analytics/top-treatments', h((req, res) => {
  res.json({ ok: true, data: analytics.topTreatments(clinicUser(req), win(req.query)) });
}));

router.get('/analytics/utilization', h((req, res) => {
  res.json({ ok: true, data: analytics.utilization(clinicUser(req), win(req.query)) });
}));

// ---------- recall list (v1.3): patients due for a check-up ----------
router.get('/recall', h((req, res, reqId) => {
  const out = analytics.recall(clinicUser(req), { months: req.query.months });
  audit(req.auth.sub, null, 'list', 'admin_recall', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: out });
}));

// ---------- reminders (v1.3) ----------
router.get('/reminders', h((req, res) => {
  res.json({ ok: true, data: reminders.list({ status: req.query.status }) });
}));

router.post('/reminders/run', h(async (req, res, reqId) => {
  const created = reminders.generate();
  const out = await reminders.runDue({});
  audit(req.auth.sub, null, 'create', 'reminders', reqId, true, `${created.length} planned, ${out.sent} sent`, 'admin', null);
  res.json({ ok: true, data: { ...out, planned: created.length, provider: reminders.PROVIDER } });
}));

router.post('/reminders', h((req, res, reqId) => {
  const out = reminders.create(req.auth, req.body || {});
  audit(req.auth.sub, null, 'create', 'reminders', reqId, true, null, 'admin', out.id);
  res.status(201).json({ ok: true, data: out });
}));

router.patch('/reminders/:id', h((req, res, reqId) => {
  const changes = reminders.setStatus(+req.params.id, (req.body || {}).status);
  audit(req.auth.sub, null, 'update', 'reminders', reqId, !!changes, null, 'admin', +req.params.id);
  if (!changes) throw httpErr(404, 'NOT_FOUND', 'No such reminder.');
  res.json({ ok: true });
}));

// ---------- backups (v1.3) ----------
router.get('/backups', h((req, res) => {
  res.json({ ok: true, data: backup.backups() });
}));

router.post('/backups', h(async (req, res, reqId) => {
  const out = await backup.create('manual');
  audit(req.auth.sub, null, 'create', 'backups', reqId, true, out.name, 'admin', null);
  res.status(201).json({ ok: true, data: out });
}));

// ---------- profit & loss + expenses (clinic-wide, v1.3) ----------
router.get('/finance/pnl', h((req, res, reqId) => {
  const out = money.pnl({ from: req.query.from, to: req.query.to });
  audit(req.auth.sub, null, 'list', 'admin_finance_pnl', reqId, true, null, 'admin', null);
  res.json({ ok: true, data: out });
}));

router.get('/inventory', h((req, res) => {
  res.json({ ok: true, data: money.listInventory() });
}));

router.post('/inventory', h((req, res, reqId) => {
  const out = money.addInventoryItem(req.auth, req.body || {});
  audit(req.auth.sub, null, 'create', 'admin_inventory_items', reqId, true, out.name, 'admin', out.id);
  res.status(201).json({ ok: true, data: out });
}));

router.post('/inventory/:id/move', h((req, res, reqId) => {
  const out = money.moveInventory(req.auth, { item_id: +req.params.id, ...(req.body || {}) });
  audit(req.auth.sub, null, 'update', 'admin_inventory_items', reqId, true, String(out.stock_qty), 'admin', out.id);
  res.json({ ok: true, data: out });
}));

router.get('/inventory/:id/moves', h((req, res) => {
  res.json({ ok: true, data: money.inventoryMoves(+req.params.id) });
}));

module.exports = router;
