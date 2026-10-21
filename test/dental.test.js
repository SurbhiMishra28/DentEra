// test/dental.test.js — supertest over the real Express app, isolated scratch DB.
// Run: npm test  (DB_FILE env points at a throwaway file; the real dental.db is never touched)
'use strict';
const path = require('path');
const scratch = path.join(__dirname, 'era.dental.test.db');
const fs = require('fs');
for (const f of [scratch, scratch + '-wal', scratch + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);
process.env.DB_FILE = scratch;
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '0'; // never bind a real port for the app-level listener

const { test, before, after } = require('node:test');
const assert = require('assert');
const request = require('supertest');
const { app } = require('../server/index.js');
const { db, localDay } = require('../server/db/connection.js');
const { validTooth } = require('../server/services/fdi.js');
const { slotClash } = require('../server/services/tools.js');

let agent;              // supertest agent keeps cookies (login once, reuse)
const TOMORROW = localDay(1);

before(async () => {
  agent = request.agent(app);
  const r = await agent.post('/api/auth/demo-login').send({ who: 'dentistA' });
  assert.strictEqual(r.status, 200, 'demo login for dentistA must work');
});

after(() => { try { for (const f of [scratch, scratch + '-wal', scratch + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });

// ---------- FDI validator (DB4) ----------
test('FDI: adult and primary ranges valid, junk invalid', () => {
  for (const t of ['11', '18', '21', '24', '38', '48', '55', '65', '85']) assert.ok(validTooth(t), t + ' must be valid');
  for (const t of ['10', '19', '09', '49', '56', '50', '86', '88', '91', '5', 'abc', '', '116']) assert.ok(!validTooth(t), t + ' must be invalid');
});

// ---------- isolation (Rules §1.2): dentist B never sees A's data ----------
test('isolation: dentist B cannot read A\'s patient chart (404)', async () => {
  const b = request.agent(app);
  await b.post('/api/auth/demo-login').send({ who: 'dentistB' });
  const r = await b.get('/api/chart/1'); // Ravi belongs to dentist A
  assert.strictEqual(r.status, 404);
  assert.ok(!/Ravi/.test(r.text), 'must not leak patient data');
});

test('isolation: dentist B cannot write A\'s patient chart (404)', async () => {
  const b = request.agent(app);
  await b.post('/api/auth/demo-login').send({ who: 'dentistB' });
  const r = await b.post('/api/chart/1').send({ tooth_fdi: '17', tooth_status: 'decayed' });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(db.prepare('SELECT COUNT(*) c FROM tooth_records WHERE tooth_fdi=?').get('17').c, 0, 'no row written');
});

test('isolation: appointment CRUD is scoped — B cannot cancel A\'s appointment', async () => {
  const b = request.agent(app);
  await b.post('/api/auth/demo-login').send({ who: 'dentistB' });
  const r = await b.delete('/api/appointments/1'); // A's seeded appointment
  assert.strictEqual(r.status, 404);
  const row = db.prepare('SELECT status FROM appointments WHERE id=1').get();
  assert.ok(row && row.status !== 'cancelled', 'A\'s appointment must survive');
});

// ---------- auth (BE3) ----------
test('auth: no token → 401 on resources', async () => {
  const r = await request(app).get('/api/patients');
  assert.strictEqual(r.status, 401);
  assert.strictEqual(r.body.error, 'AUTH_REQUIRED');
});
test('auth: wrong password → 401 without existence leak', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: 'meera@dental.local', password: 'wrongwrong' });
  assert.strictEqual(r.status, 401);
  assert.ok(!/no such|not found|unknown user/i.test(r.body.message), r.body.message);
});
test('auth: unknown email is rejected — no auto-signup (doctors + admin only)', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: 'newdoc@dental.local', password: 'pass1234' });
  assert.strictEqual(r.status, 401);
  assert.ok(/doctor/i.test(r.body.message), 'must explain that only doctors can sign in');
  const none = db.prepare('SELECT COUNT(*) c FROM users WHERE email=?').get('newdoc@dental.local');
  assert.strictEqual(none.c, 0, 'no account may be created for an unknown email');
});
test('auth: admin signs in with username admin + surbhi; non-doctor roles cannot', async () => {
  const a = await request(app).post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  assert.strictEqual(a.status, 200, a.body.message || '');
  assert.strictEqual(a.body.user.role, 'admin');
  assert.strictEqual(a.body.user.dentistId, null);
  const wrong = await request(app).post('/api/auth/login').send({ email: 'admin', password: 'password123' });
  assert.strictEqual(wrong.status, 401);
  const rec = await request(app).post('/api/auth/login').send({ email: 'desk@dental.local', password: 'password123' });
  assert.strictEqual(rec.status, 401, 'reception/other roles must never sign in');
});

// ---------- FDI enforced at the API (BE5) ----------
test('chart: invalid FDI is a 400, valid record saves (201)', async () => {
  const bad = await agent.post('/api/chart/2').send({ tooth_fdi: '99', tooth_status: 'decayed' });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(bad.body.error, 'BAD_FDI');
  const bad2 = await agent.post('/api/chart/2').send({ tooth_fdi: '16', tooth_status: 'purple' });
  assert.strictEqual(bad2.status, 400);
  const ok = await agent.post('/api/chart/2').send({ tooth_fdi: '26', tooth_status: 'filled', treatment_id: 3, notes: 'test' });
  assert.strictEqual(ok.status, 201);
});

// ---------- slot clash = interval overlap (BE4) ----------
test('slotClash: overlap refused 409, touching end allowed', async () => {
  // next MONDAY: Meera works Mon–Fri, and demo seed only occupies tomorrow — keeps the date clean
  const dm = new Date(); dm.setDate(dm.getDate() + (((1 - dm.getDay()) % 7 + 7) % 7 || 7));
  const MON = `${dm.getFullYear()}-${String(dm.getMonth() + 1).padStart(2, '0')}-${String(dm.getDate()).padStart(2, '0')}`;
  const mk = await agent.post('/api/appointments').send({ date: MON, start_time: '09:00', end_time: '10:30', patient_name: 'Long' });
  assert.strictEqual(mk.status, 201, mk.body.message || '');
  const overlap = await agent.post('/api/appointments').send({ date: MON, start_time: '09:30', patient_name: 'X' });
  assert.strictEqual(overlap.status, 409);
  const touch = await agent.post('/api/appointments').send({ date: MON, start_time: '10:30', patient_name: 'Y' });
  assert.strictEqual(touch.status, 201);
  db.prepare('DELETE FROM appointments WHERE id=?').run(mk.body.data.appointment_id);
  db.prepare('DELETE FROM appointments WHERE id=?').run(touch.body.data.appointment_id);
});

// ---------- public booking (BE7) ----------
const nextWorkDay = () => { // dentist 1 (Meera) works Mon–Fri; skip to the next weekday
  const d = new Date(); d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
test('public booking: valid 201 + source=public; bad phone 400; past date 400; clash 409', async () => {
  const WORKDAY = nextWorkDay();
  const free = (await request(app).get(`/api/public/slots?dentist=1&date=${WORKDAY}`)).body.data;
  assert.ok(free.length > 0, `must have free slots on a working day (${WORKDAY}) — got none`);
  const slot = free[free.length - 1].time; // latest free slot — least likely to be taken mid-test
  const ok = await request(app).post('/api/public/booking').send({ dentist_id: 1, date: WORKDAY, time: slot, name: 'Kabir', phone: '9810022223', reason: 'pain' });
  assert.strictEqual(ok.status, 201, ok.body.message || '');
  const row = db.prepare('SELECT source,patient_name FROM appointments WHERE id=?').get(ok.body.data.id);
  assert.strictEqual(row.source, 'public'); assert.strictEqual(row.patient_name, 'Kabir');
  db.prepare('DELETE FROM appointments WHERE id=?').run(ok.body.data.id);

  const badPhone = await request(app).post('/api/public/booking').send({ dentist_id: 1, date: WORKDAY, time: '12:00', name: 'A', phone: 'abc' });
  assert.strictEqual(badPhone.status, 400);
  const past = await request(app).post('/api/public/booking').send({ dentist_id: 1, date: '2020-01-01', time: '12:00', name: 'A', phone: '9810022223' });
  assert.strictEqual(past.status, 400);
  // book a real slot via doctor, then try public into the same interval
  const seed = db.prepare(`INSERT INTO appointments(dentist_id,patient_id,patient_name,appointment_date,start_time,end_time,status,reason,source)
    VALUES (1,NULL,'Busy',?,'12:00','12:30','scheduled','x','doctor')`).run(WORKDAY).lastInsertRowid;
  const clash = await request(app).post('/api/public/booking').send({ dentist_id: 1, date: WORKDAY, time: '12:00', name: 'C', phone: '9810022224' });
  assert.strictEqual(clash.status, 409);
  db.prepare('DELETE FROM appointments WHERE id=?').run(seed);
});

test('public booking: 6th attempt in 10 min → 429', async () => {
  let last = 0;
  for (let i = 0; i < 6; i++) {
    const r = await request(app).post('/api/public/booking').send({ dentist_id: 1, date: TOMORROW, time: `0${i}:00`, name: 'T', phone: '9810022225' });
    last = r.status; // first requests fail validation (00:00 etc may be valid times) but STILL count
  }
  assert.strictEqual(last, 429, 'the limiter must trip after 5 attempts');
});

// ---------- booking contact fields (email / address) ----------
// fresh-IP public attempts (the public route is rate-limited 5/10min/IP — a unique IP gets a fresh bucket)
const PUBLIC_IP = '203.0.113.11';
const pad2 = n => String(n).padStart(2, '0');
// a :30 slot nobody has taken for dentist 1 tomorrow
function freeTime() {
  const busy = new Set(db.prepare("SELECT start_time FROM appointments WHERE dentist_id=1 AND appointment_date=? AND status!='cancelled'").all(TOMORROW).map(r => r.start_time));
  for (let h = 8; h < 20; h++) { const t = `${pad2(h)}:30`; if (!busy.has(t)) return t; }
  return null;
}
const end30 = t => { const [h, m] = t.split(':').map(Number); const s = h * 60 + m + 30; return `${pad2(Math.floor(s / 60) % 24)}:${pad2(s % 60)}` };

test('public: booking stores email + address on the appointment row', async () => {
  const time = freeTime();
  const r = await request(app).post('/api/public/booking').set('x-forwarded-for', PUBLIC_IP).send({
    dentist_id: 1, date: TOMORROW, time, name: 'Email Test', phone: '9810033333',
    email: 'email.test@example.com', address: '12 Hill Road, Pune' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const row = db.prepare('SELECT email,address FROM appointments WHERE id=?').get(r.body.data.id);
  assert.strictEqual(row.email, 'email.test@example.com');
  assert.strictEqual(row.address, '12 Hill Road, Pune');
  db.prepare('DELETE FROM appointments WHERE id=?').run(r.body.data.id); // keep the scratch DB tidy for later tests
});

test('appointment: doctor booking with email + address is listed back', async () => {
  const time = freeTime();
  const r = await agent.post('/api/appointments').send({
    patient_name: 'Clinic Test', date: TOMORROW, start_time: time, end_time: end30(time),
    reason: 'Checkup', email: 'clinic.test@example.com', address: '99 Park Lane, Nagpur' });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  const id = r.body.data.appointment_id;
  const list = await agent.get(`/api/appointments?date=${TOMORROW}`);
  const row = list.body.data.find(a => a.id === id);
  assert.ok(row, 'the new appointment must be listed');
  assert.strictEqual(row.email, 'clinic.test@example.com');
  assert.strictEqual(row.address, '99 Park Lane, Nagpur');
});

// ---------- plans + invoices (BE6) ----------
test('plan: one transaction creates plan+items+invoice; item done recompute; invoice paid', async () => {
  const mk = await agent.post('/api/plans').send({ patient_id: 2, title: 'Test plan', items: [
    { treatment_name: 'Scaling', cost: 800, visit_no: 1 }, { tooth_fdi: '36', cost: 2500, visit_no: 2 }] });
  assert.strictEqual(mk.status, 201);
  const planId = mk.body.data.plan_id;
  const det = await agent.get(`/api/plans/${planId}`);
  assert.strictEqual(det.body.data.items.length, 2);
  const inv = db.prepare('SELECT * FROM invoices WHERE plan_id=?').get(planId);
  assert.ok(inv && inv.amount === 3300 && inv.status === 'unpaid', 'auto-invoice must exist');

  const item = det.body.data.items[0];
  const done = await agent.patch(`/api/plans/${planId}/items/${item.id}`).send({ status: 'done' });
  assert.strictEqual(done.status, 200);

  const paid = await agent.patch(`/api/invoices/${inv.id}`).send({ paid_amount: 3300 });
  assert.strictEqual(paid.body.data.status, 'paid');
  const half = await agent.patch(`/api/invoices/${inv.id}`).send({ paid_amount: 1000 });
  assert.strictEqual(half.body.data.status, 'partial'); // can regress if edited
  // cleanup
  db.prepare('DELETE FROM invoices WHERE id=?').run(inv.id);
  db.prepare('DELETE FROM plan_items WHERE plan_id=?').run(planId);
  db.prepare('DELETE FROM treatment_plans WHERE id=?').run(planId);
});

// ---------- staff access (F8, updated: only doctors + admin may hold an account) ----------
test('staff: admin (via username+password) reads invoices but cannot write charts (403)', async () => {
  const gone = await request(app).post('/api/auth/demo-login').send({ who: 'reception' });
  assert.strictEqual(gone.status, 400, 'reception demo persona must no longer exist');
  const noDemoAdmin = await request(app).post('/api/auth/demo-login').send({ who: 'admin' });
  assert.strictEqual(noDemoAdmin.status, 400, 'admin must NOT be a demo persona — password login only');
  const a = request.agent(app);
  const al = await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  assert.strictEqual(al.status, 200, al.body.message || '');
  assert.strictEqual(al.body.user.role, 'admin');
  const inv = await a.get('/api/invoices');
  assert.strictEqual(inv.status, 200);
  const chart = await a.get('/api/chart/1');
  assert.strictEqual(chart.status, 403);
});

// ---------- assistant brain (BE8) ----------
test('assistant: books by voice with date+time, denies non-dentists, answers KB with safety line', async () => {
  const chat = await agent.post('/api/assistant/chat').send({ message: `book an appointment tomorrow at 5pm for Ravi` });
  assert.strictEqual(chat.status, 200);
  assert.strictEqual(chat.body.tool, 'createAppointment');
  assert.ok(chat.body.write);
  db.prepare('DELETE FROM appointments WHERE id=?').run(chat.body.tool_result.appointment_id);

  const rec = request.agent(app);
  await rec.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' }); // admin has no dentistId → tool denied
  const denied = await rec.post('/api/assistant/chat').send({ message: 'book an appointment tomorrow at 5pm for Ravi' });
  assert.strictEqual(denied.body.denied, true);
  assert.ok(/dental account/.test(denied.body.reply));

  const kb = await agent.post('/api/assistant/chat').send({ message: 'I have a toothache since night' });
  assert.ok(/visit your dentist/i.test(kb.body.reply), 'KB answers must carry the safety line');
});

test('chat history: today conversation exists with user+era rows; cross-user read → 404', async () => {
  const list = await agent.get('/api/assistant/conversations');
  assert.strictEqual(list.status, 200);
  const today = list.body.data.find(c => c.day === localDay(0));
  assert.ok(today, 'today conversation must exist after chats');
  const one = await agent.get(`/api/assistant/conversations/${today.id}`);
  const roles = one.body.data.messages.map(m => m.role);
  assert.ok(roles.includes('user') && roles.includes('era'));
  const b = request.agent(app);
  await b.post('/api/auth/demo-login').send({ who: 'dentistB' });
  const cross = await b.get(`/api/assistant/conversations/${today.id}`);
  assert.strictEqual(cross.status, 404);
});

// ---------- health (F14) ----------
test('health: ok shape', async () => {
  const r = await request(app).get('/api/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.ok, true);
  assert.ok(r.body.version);
});

// ---------- admin extras: doctors, invoice print payload ----------
test('admin: dentists list + add doctor + the new doctor can sign in', async () => {
  const noauth = await request(app).get('/api/admin/dentists');
  assert.strictEqual(noauth.status, 401, 'dentist list requires sign-in');
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const list = await a.get('/api/admin/dentists');
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.data.length >= 2, 'the two demo doctors must be listed');
  const mk = await a.post('/api/admin/dentists').send({
    name: 'Dr. Kavya Nair', email: 'kavya@dental.local', password: 'temp12345', specialty: 'Endodontics', room_no: 'OPD-3' });
  assert.strictEqual(mk.status, 201, mk.body.message || '');
  const dup = await a.post('/api/admin/dentists').send({ name: 'X', email: 'kavya@dental.local', password: 'temp12345' });
  assert.strictEqual(dup.status, 409, 'duplicate email must be refused');
  const weak = await a.post('/api/admin/dentists').send({ name: 'Y', email: 'y@dental.local', password: 'abc' });
  assert.strictEqual(weak.status, 400, 'weak temp password must be refused');
  const login = await request(app).post('/api/auth/login').send({ email: 'kavya@dental.local', password: 'temp12345' });
  assert.strictEqual(login.status, 200, 'the new doctor must be able to sign in right away');
  assert.strictEqual(login.body.user.role, 'dentist');
  assert.ok(login.body.user.dentistId, 'the new doctor must have a dentist profile');
});

test('admin: invoice print payload has patient + items + due', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const r = await a.get('/api/admin/invoices/1');
  assert.strictEqual(r.status, 200, r.body.message || '');
  assert.ok(r.body.data.invoice && r.body.data.invoice.amount > 0);
  assert.ok(r.body.data.patient && r.body.data.patient.name, 'print payload must include the patient');
  assert.ok(Array.isArray(r.body.data.items));
  assert.strictEqual(typeof r.body.data.due, 'number');
  const missing = await a.get('/api/admin/invoices/99999');
  assert.strictEqual(missing.status, 404);
});

// ---------- change password ----------
test('auth: change-password verifies the current one and persists', async () => {
  const a = request.agent(app);
  const noauth = await request(app).post('/api/auth/change-password').send({ current: 'x', next: 'yyyyyy' });
  assert.strictEqual(noauth.status, 401, 'change-password requires sign-in');
  const wrong = await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  assert.strictEqual(wrong.status, 200);
  const badCurrent = await a.post('/api/auth/change-password').send({ current: 'wrong', next: 'newpass123' });
  assert.strictEqual(badCurrent.status, 401);
  const tooShort = await a.post('/api/auth/change-password').send({ current: 'surbhi', next: 'abc' });
  assert.strictEqual(tooShort.status, 400);
  const ok = await a.post('/api/auth/change-password').send({ current: 'surbhi', next: 'newpass123' });
  assert.strictEqual(ok.status, 200, ok.body.message || '');
  const oldLogin = await request(app).post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  assert.strictEqual(oldLogin.status, 401, 'the old password must stop working');
  const newLogin = await request(app).post('/api/auth/login').send({ email: 'admin', password: 'newpass123' });
  assert.strictEqual(newLogin.status, 200, 'the new password must work');
  const back = await a.post('/api/auth/change-password').send({ current: 'newpass123', next: 'surbhi' });
  assert.strictEqual(back.status, 200, 'restore the original password for later tests');
});

// ---------- public track by phone ----------
test('public: track booking by phone (digits-normalised)', async () => {
  const ip = '203.0.113.77'; // unique limiter bucket so earlier booking tests don't throttle this one
  const book = await request(app).post('/api/public/booking').set('x-forwarded-for', ip)
    .send({ dentist_id: 1, date: TOMORROW, time: '15:40', name: 'TrackMe', phone: '+91 98100 99999', reason: 'track test' });
  assert.strictEqual(book.status, 201, book.body.message || '');
  const hit = await request(app).post('/api/public/track').set('x-forwarded-for', ip).send({ phone: '9810099999' });
  assert.strictEqual(hit.status, 200);
  assert.ok(hit.body.data.some(r => r.patient_name === 'TrackMe'), 'booking must be found by the same digits');
  const miss = await request(app).post('/api/public/track').set('x-forwarded-for', ip).send({ phone: '9800000000' });
  assert.strictEqual(miss.status, 200);
  assert.strictEqual(miss.body.data.length, 0, 'unknown phone returns an empty list');
  const bad = await request(app).post('/api/public/track').set('x-forwarded-for', ip).send({ phone: 'abc' });
  assert.strictEqual(bad.status, 400);
  db.prepare(`DELETE FROM appointments WHERE patient_name='TrackMe'`).run();
});

// =====================================================================
// v1.3 — payments, clinical records, insights, reminders, portal, security
// =====================================================================

// ---------- payments (payments table + recompute) ----------
test('payments: partial then full; overpay refused; history kept; dentist scoped', async () => {
  const inv = db.prepare("SELECT * FROM invoices ORDER BY id DESC LIMIT 1").get();
  const item = db.prepare("SELECT id, amount FROM invoices WHERE status!='paid' ORDER BY id LIMIT 1").get();
  assert.ok(item, 'seeded invoices exist');
  // dentist A (Sara's doctor) records a partial payment
  const part = await agent.post(`/api/invoices/${item.id}/payments`).send({ amount: 100, method: 'upi' });
  assert.strictEqual(part.status, 201, part.body.message || '');
  assert.strictEqual(part.body.data.status, 'partial');
  const over = await agent.post(`/api/invoices/${item.id}/payments`).send({ amount: 999999 });
  assert.strictEqual(over.status, 400, 'overpay must be refused');
  const zero = await agent.post(`/api/invoices/${item.id}/payments`).send({ amount: 0 });
  assert.strictEqual(zero.status, 400, 'zero payment must be refused');
  // dentist B cannot touch A patient's invoice → 404 (no existence leak)
  const b = request.agent(app);
  await b.post('/api/auth/demo-login').send({ who: 'dentistB' });
  const cross = await b.post(`/api/invoices/${item.id}/payments`).send({ amount: 50 });
  assert.strictEqual(cross.status, 404);
  const hist = await agent.get(`/api/invoices/${item.id}/payments`);
  assert.strictEqual(hist.status, 200);
  assert.ok(hist.body.data.payments.length >= 1, 'payment history must list rows');
  // finish it off through the new endpoint
  const due = hist.body.data.due;
  const full = await agent.post(`/api/invoices/${item.id}/payments`).send({ amount: due, method: 'cash' });
  assert.strictEqual(full.body.data.status, 'paid');
  assert.strictEqual(full.body.data.due, 0);
  db.prepare('DELETE FROM payments WHERE invoice_id=?').run(item.id);
  db.prepare("UPDATE invoices SET paid_amount=0, status='unpaid', updated_at=datetime('now') WHERE id=?").run(item.id);
});

// ---------- expenses ----------
test('expenses: logged by staff, listed, and counted in P&L', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const mk = await a.post('/api/expenses').send({ category: 'lab', description: 'Test lab work', amount: 4200 });
  assert.strictEqual(mk.status, 201, mk.body.message || '');
  const bad = await a.post('/api/expenses').send({ category: 'lab', description: '', amount: 10 });
  assert.strictEqual(bad.status, 400);
  const list = await a.get('/api/expenses');
  assert.ok(list.body.data.some(e => e.description === 'Test lab work'));
  const pnl = await a.get('/api/finance/pnl');
  assert.strictEqual(pnl.status, 200);
  assert.ok(pnl.body.data.income >= 0 && pnl.body.data.expense >= 0 && typeof pnl.body.data.profit === 'number');
  db.prepare("DELETE FROM expenses WHERE description='Test lab work'").run();
});

// ---------- inventory ----------
test('inventory: add, stock moves down, low-stock flag raised', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const mk = await a.post('/api/inventory').send({ name: 'Test Gloves', unit: 'box', stock_qty: 3, min_qty: 2, unit_cost: 250 });
  assert.strictEqual(mk.status, 201);
  const id = mk.body.data.id;
  const out = await a.post(`/api/inventory/${id}/move`).send({ delta: -2, reason: 'used in clinic' });
  assert.strictEqual(out.status, 200);
  assert.strictEqual(out.body.data.stock_qty, 1);
  assert.strictEqual(out.body.data.low, true, 'below minimum must flag low');
  const moves = await a.get(`/api/inventory/${id}/moves`);
  assert.ok(moves.body.data.length >= 1);
  db.prepare('DELETE FROM inventory_moves WHERE item_id=?').run(id);
  db.prepare('DELETE FROM inventory_items WHERE id=?').run(id);
});

// ---------- documents (X-ray upload) ----------
test('documents: upload + list + fetch + delete; other dentists get 404', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const up = await agent.post('/api/documents').send({
    patient_id: 1, kind: 'xray', filename: 'ravi-bitewing.png', mime: 'image/png', data: `data:image/png;base64,${png}` });
  assert.strictEqual(up.status, 201, up.body.message || '');
  const id = up.body.data.id;
  const list = await agent.get('/api/patients/1/documents');
  assert.ok(list.body.data.some(d => d.id === id));
  const file = await agent.get(`/api/documents/${id}/file`);
  assert.strictEqual(file.status, 200);
  assert.ok(/image/.test(file.headers['content-type']));
  const b = request.agent(app);
  await b.post('/api/auth/demo-login').send({ who: 'dentistB' });
  const cross = await b.get(`/api/documents/${id}/file`);
  assert.strictEqual(cross.status, 404, 'another dentist must not read the file');
  const badType = await agent.post('/api/documents').send({ patient_id: 1, kind: 'other', filename: 'x.exe', mime: 'application/x-msdownload', data: Buffer.from('MZ').toString('base64') });
  assert.strictEqual(badType.status, 400, 'non-image/pdf uploads must be refused');
  const del = await agent.del(`/api/documents/${id}`);
  assert.strictEqual(del.status, 200);
  db.prepare('DELETE FROM documents WHERE id=?').run(id);
});

// ---------- prescriptions ----------
test('prescriptions: create with items, list per patient, print payload', async () => {
  const mk = await agent.post('/api/prescriptions').send({
    patient_id: 1, diagnosis: 'Acute pulpitis 36', advice: 'Warm salt water rinses',
    items: [{ medicine: 'Amoxycillin 500', dose: '1 cap', frequency: '3x/day', days: 5 }, { medicine: 'Ibuprofen 400', frequency: 'SOS' }] });
  assert.strictEqual(mk.status, 201, mk.body.message || '');
  const list = await agent.get('/api/patients/1/prescriptions');
  assert.ok(list.body.data.some(r => r.id === mk.body.data.prescription_id));
  const print = await agent.get(`/api/prescriptions/${mk.body.data.prescription_id}`);
  assert.strictEqual(print.status, 200);
  assert.strictEqual(print.body.data.items.length, 2);
  assert.ok(print.body.data.patient && print.body.data.patient.name);
  db.prepare('DELETE FROM prescription_items WHERE prescription_id=?').run(mk.body.data.prescription_id);
  db.prepare('DELETE FROM prescriptions WHERE id=?').run(mk.body.data.prescription_id);
});

// ---------- periodontal charting ----------
test('perio: six sites saved; summary reports max depth and bleeding', async () => {
  const sites = [1, 2, 3, 4, 5, 6].map(s => ({ site: s, pocket_depth: s === 3 ? 5 : 2, bleeding: s === 3 }));
  const save = await agent.post('/api/chart/1/perio').send({ tooth_fdi: '16', sites, notes: 'baseline' });
  assert.strictEqual(save.status, 201, save.body.message || '');
  const sum = await agent.get('/api/chart/1/perio');
  assert.strictEqual(sum.status, 200);
  const tooth = sum.body.data.byTooth['16'];
  assert.ok(tooth, 'tooth 16 must be charted');
  assert.strictEqual(tooth.max_pd, 5);
  assert.strictEqual(tooth.bleeding, 1);
  assert.strictEqual(Object.keys(tooth.sites).length, 6);
  const bad = await agent.post('/api/chart/1/perio').send({ tooth_fdi: '16', sites: [{ site: 9, pocket_depth: 3 }] });
  assert.strictEqual(bad.status, 400, 'site 9 must be refused');
  db.prepare("DELETE FROM perio_records WHERE patient_id=1 AND tooth_fdi='16'").run();
});

// ---------- analytics + recall ----------
test('analytics: summary + trend + top treatments + recall for a dentist', async () => {
  const s = await agent.get('/api/analytics/summary');
  assert.strictEqual(s.status, 200);
  assert.ok(['appointments', 'completed', 'revenue_collected', 'outstanding'].every(k => k in s.body.data));
  const t = await agent.get('/api/analytics/trend');
  assert.ok(Array.isArray(t.body.data) && t.body.data.length > 0);
  const tt = await agent.get('/api/analytics/top-treatments');
  assert.ok(Array.isArray(tt.body.data));
  const rec = await agent.get('/api/recall');
  assert.strictEqual(rec.status, 200);
  assert.ok(Array.isArray(rec.body.data), 'recall list must be an array');
});

// ---------- staff accounts ----------
test('staff: admin creates a reception account that can sign in and is scoped', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const mk = await a.post('/api/admin/staff').send({ name: 'Reception Reena', email: 'reena@dental.local', password: 'temp12345' });
  assert.strictEqual(mk.status, 201, mk.body.message || '');
  assert.strictEqual(mk.body.data.role, 'reception');
  const login = await request(app).post('/api/auth/login').send({ email: 'reena@dental.local', password: 'temp12345' });
  assert.strictEqual(login.status, 200, 'reception must be able to sign in');
  assert.strictEqual(login.body.user.role, 'reception');
  const asReception = request.agent(app);
  await asReception.post('/api/auth/login').send({ email: 'reena@dental.local', password: 'temp12345' });
  // reception may read invoices clinic-wide but not charts
  const inv = await asReception.get('/api/invoices');
  assert.strictEqual(inv.status, 200);
  const chart = await asReception.get('/api/chart/1');
  assert.strictEqual(chart.status, 403, 'chart stays dentist-only');
  // only admin may manage staff
  const forbidden = await asReception.post('/api/admin/staff').send({ name: 'X', email: 'x@dental.local', password: 'temp12345' });
  assert.strictEqual(forbidden.status, 403);
  const rm = await a.del(`/api/admin/staff/${mk.body.data.id}`);
  assert.strictEqual(rm.status, 200);
  db.prepare("DELETE FROM conversations WHERE user_id=(SELECT id FROM users WHERE email='reena@dental.local')").run();
  db.prepare("DELETE FROM users WHERE email='reena@dental.local'").run();
});

// ---------- reminders ----------
test('reminders: generated for tomorrow, run marks them sent (console provider)', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const before = (await a.get('/api/admin/reminders')).body.data.length;
  const run = await a.post('/api/admin/reminders/run');
  assert.strictEqual(run.status, 200, run.body.message || '');
  assert.ok(run.body.data.sent >= 1, 'at least one reminder must go out');
  assert.strictEqual(run.body.data.provider, 'console');
  const after = (await a.get('/api/admin/reminders')).body.data;
  assert.ok(after.length >= before, 'list must not shrink');
  assert.ok(after.some(r => r.status === 'sent'), 'a sent reminder must exist');
});

// ---------- backups ----------
test('backups: admin can snapshot the DB on demand', async () => {
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const mk = await a.post('/api/admin/backups');
  assert.strictEqual(mk.status, 201, mk.body.message || '');
  assert.ok(/\.db$/.test(mk.body.data.name));
  const list = await a.get('/api/admin/backups');
  assert.ok(list.body.data.some(b => b.name === mk.body.data.name));
});

// ---------- notifications + SSE ----------
test('notifications: public booking pushes a staff notification; SSE needs a session', async () => {
  const noauth = await request(app).get('/api/notifications');
  assert.strictEqual(noauth.status, 401);
  const a = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'admin', password: 'surbhi' });
  const list = await a.get('/api/notifications');
  assert.strictEqual(list.status, 200);
  assert.ok(Array.isArray(list.body.data));
  const unreadBefore = list.body.unread;
  const ip = '203.0.113.90';
  const book = await request(app).post('/api/public/booking').set('x-forwarded-for', ip)
    .send({ dentist_id: 1, date: localDay(2), time: '16:15', name: 'NotifyMe', phone: '9810088888' });
  assert.strictEqual(book.status, 201, book.body.message || '');
  const after = await a.get('/api/notifications');
  assert.ok(after.body.unread >= unreadBefore + 1, 'the booking must raise the bell count');
  const read = await a.post('/api/notifications/read').send({});
  assert.strictEqual(read.status, 200);
  const again = await a.get('/api/notifications');
  assert.strictEqual(again.body.unread, 0, 'mark-all-read must clear the badge');
  db.prepare("DELETE FROM appointments WHERE patient_name='NotifyMe'").run();
});

// ---------- security: rate limit + CSRF ----------
test('security: per-IP limiter trips; cookie POST from a foreign origin is blocked', () => {
  // unit-test the limiter with a fresh module instance (GET cap = 600/min)
  const p = require.resolve('../server/middleware/rateLimit.js');
  delete require.cache[p];
  const { limiter } = require(p);
  let blocked = 0;
  const mkRes = () => ({ status() { return this; }, json() { blocked++; return this; }, end() { blocked++; return this; } });
  for (let i = 0; i < 620; i++) limiter({ method: 'GET', path: '/api/patients', headers: {}, socket: { remoteAddress: '5.5.5.5' } }, mkRes(), () => {});
  assert.ok(blocked > 0, 'the read cap must trip within 620 requests');
  // writes carry their own, lower cap — 320 writes must trip it too
  let writeBlocked = 0;
  const mkRes2 = () => ({ status() { return this; }, json() { writeBlocked++; return this; }, end() { writeBlocked++; return this; } });
  for (let i = 0; i < 320; i++) limiter({ method: 'POST', path: '/api/patients', headers: {}, socket: { remoteAddress: '6.6.6.6' } }, mkRes2(), () => {});
  assert.ok(writeBlocked > 0, 'the write cap must trip within 320 requests');
  const csrf = require('../server/middleware/csrf').csrfGuard;
  let code = 0;
  csrf({ method: 'POST', path: '/api/patients', headers: { cookie: 'dent_token=x', origin: 'http://evil.example' } },
    { status(c) { code = c; return this; }, json() { return this; } }, () => {});
  assert.strictEqual(code, 403, 'foreign-origin POST with the session cookie must be blocked');
});

// ---------- patient portal ----------
const PORTAL = { phone: '9810022222', dob: '1992-09-30' }; // Sara Khan (dentist A's patient)

test('portal: phone + dob sign-in, own records, payment, booking, cancel', async () => {
  const badDob = await request(app).post('/api/portal/login').send({ phone: PORTAL.phone, dob: '1990-01-01' });
  assert.strictEqual(badDob.status, 401, 'wrong dob must be refused');
  const login = await request(app).post('/api/portal/login').send(PORTAL);
  assert.strictEqual(login.status, 200, login.body.message || '');
  assert.ok(login.body.token);
  const cookie = login.headers['set-cookie'];
  const me = request(app);
  const meReq = extra => me.get('/api/portal/me').set('Cookie', cookie);
  const meRes = await meReq();
  assert.strictEqual(meRes.body.data.name, 'Sara Khan');
  const portalGet = p => me.get(p).set('Cookie', cookie);
  const portalPost = (p, body) => me.post(p).set('Cookie', cookie).send(body);
  // appointments + invoices + chart are scoped to this patient
  const appts = await portalGet('/api/portal/appointments');
  assert.strictEqual(appts.status, 200);
  const invs = (await portalGet('/api/portal/invoices')).body.data;
  assert.ok(invs.length >= 1, 'Sara has a seeded invoice');
  const chart = await portalGet('/api/portal/chart');
  assert.strictEqual(chart.status, 200);
  assert.strictEqual(chart.body.data.patient.id, invs[0].patient_id);
  // a dentist token must NOT pass the portal guard
  const asDentist = await agent.get('/api/portal/me');
  assert.strictEqual(asDentist.status, 403);
  // pay part of the first unpaid invoice
  const target = invs.find(i => i.status !== 'paid') || invs[0];
  const pay = await portalPost(`/api/portal/invoices/${target.id}/payments`, { amount: 500, method: 'upi' });
  assert.strictEqual(pay.status, 201, pay.body.message || '');
  assert.strictEqual(pay.body.data.status, 'partial');
  // book + cancel one of my own visits (unique IP: the public route is rate-limited per IP)
  const slots = (await request(app).get(`/api/public/slots?dentist=1&date=${localDay(1)}`).set('x-forwarded-for', '203.0.113.55')).body.data;
  assert.ok(slots && slots.length > 0, 'free slots must exist');
  const book = await portalPost('/api/portal/appointments', { dentist_id: 1, date: localDay(1), time: slots[slots.length - 1].time, reason: 'Portal booking test' });
  assert.strictEqual(book.status, 201, book.body.message || '');
  const cancel = await portalPost(`/api/portal/appointments/${book.body.data.id}/cancel`, {});
  assert.strictEqual(cancel.status, 200);
  // cleanup: payment + the portal account row
  db.prepare('DELETE FROM payments WHERE invoice_id=?').run(target.id);
  db.prepare('DELETE FROM appointments WHERE id=?').run(book.body.data.id);
  db.prepare("UPDATE invoices SET paid_amount=paid_amount-500, status=CASE WHEN paid_amount-500>=amount-discount THEN 'paid' WHEN paid_amount-500>0 THEN 'partial' ELSE 'unpaid' END WHERE id=?").run(target.id);
});

// ---------- assistant: briefing + smart reschedule (v1.3 tools) ----------
test('assistant: briefing aggregates the day; move-to-next-free-slot moves the visit', async () => {
  const brief = await agent.post('/api/assistant/chat').send({ message: 'give me my morning briefing' });
  assert.strictEqual(brief.status, 200);
  assert.ok(/appointment|invoice|check/i.test(brief.body.reply), 'briefing must speak the numbers');
  const rows = db.prepare("SELECT id FROM appointments WHERE status='scheduled' ORDER BY id LIMIT 1").all();
  if (rows.length) {
    const moved = await agent.post('/api/assistant/chat').send({ message: `move appointment ${rows[0].id} to the next free slot` });
    assert.strictEqual(moved.status, 200);
    assert.strictEqual(moved.body.tool, 'moveToNextSlot');
    assert.ok(/next free slot/i.test(moved.body.reply));
  }
});
