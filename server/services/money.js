// server/services/money.js — payments (with per-payment history), expenses and
// the clinic's consumable inventory. Money is ALWAYS integer rupees (no floats).
// Dentists stay scoped to their own patients; admin/reception see the whole clinic.
'use strict';
const { db, localDay } = require('../db/connection');
const { httpErr } = require('../middleware/auth');
const { assertPatientMine } = require('./tools');
const { push } = require('./notify');

const METHODS = ['cash', 'upi', 'card', 'bank', 'other'];
const EXPENSE_CATS = ['rent', 'salary', 'lab', 'material', 'utility', 'marketing', 'equipment', 'other'];

const dueOf = inv => Math.max(0, (inv.amount || 0) - (inv.discount || 0) - (inv.paid_amount || 0));
const statusFor = paid => (paid > 0 ? 'partial' : 'unpaid'); // caller decides 'paid'

function listInvoices(u, { status, patient_id } = {}) {
  if (u.role === 'dentist') {
    return db.prepare(`SELECT i.* FROM invoices i JOIN dentist_patients dp ON dp.patient_id=i.patient_id
      WHERE dp.dentist_id=? ${patient_id ? 'AND i.patient_id=?' : ''} ${status ? 'AND i.status=?' : ''} ORDER BY i.id DESC`)
      .all(...[u.dentistId, patient_id ? +patient_id : null, status || null].filter(v => v !== null && v !== undefined));
  }
  if (u.role === 'patient') { // portal: only this patient's invoices
    return db.prepare(`SELECT * FROM invoices WHERE patient_id=? ${status ? 'AND status=?' : ''} ORDER BY id DESC`)
      .all(...[+patient_id, status || null].filter(v => v !== null && v !== undefined));
  }
  return db.prepare(`SELECT * FROM invoices ${status ? "WHERE status=?" : ''} ORDER BY id DESC LIMIT 100`)
    .all(...(status ? [status] : []));
}

// record a payment: append a payments row, then recompute the invoice (source of truth = payments)
function recordPayment(u, { invoice_id, amount, method, reference } = {}) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(+invoice_id);
  if (!inv) throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
  if (u.role === 'dentist') assertPatientMine(u.dentistId, inv.patient_id);
  const due = dueOf(inv);
  const pay = Math.round(+amount);
  if (!Number.isFinite(pay) || pay <= 0) throw httpErr(400, 'BAD_REQUEST', 'Enter a payment amount greater than zero.');
  if (pay > due) throw httpErr(400, 'BAD_AMOUNT', `Only ${due} rupees are due on this invoice.`);
  const m = METHODS.includes(method) ? method : 'cash';
  const tx = db.transaction(() => {
    const id = db.prepare(`INSERT INTO payments(invoice_id,patient_id,amount,method,reference,received_by)
      VALUES (?,?,?,?,?,?)`).run(inv.id, inv.patient_id, pay, m,
        reference ? String(reference).slice(0, 80) : null, u.sub).lastInsertRowid;
    const total = db.prepare('SELECT COALESCE(SUM(amount),0) c FROM payments WHERE invoice_id=?').get(inv.id).c;
    const status = total >= inv.amount - inv.discount ? 'paid' : statusFor(total);
    db.prepare("UPDATE invoices SET paid_amount=?, status=?, updated_at=datetime('now') WHERE id=?").run(total, status, inv.id);
    return { id, total, status };
  });
  const out = tx();
  push({ audience: 'staff', kind: 'payment', title: `Payment received — invoice #${inv.id}`,
    body: `₹${pay} via ${m}${reference ? ' · ' + reference : ''}`, link: '#/admin' });
  return { payment_id: out.id, invoice_id: inv.id, amount: pay, method: m,
    paid_amount: out.total, status: out.status, due: dueOf({ ...inv, paid_amount: out.total }) };
}

function paymentsOf(u, invoice_id) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(+invoice_id);
  if (!inv) throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
  if (u.role === 'dentist') assertPatientMine(u.dentistId, inv.patient_id);
  const rows = db.prepare(`SELECT p.id,p.amount,p.method,p.reference,p.created_at,u.name AS received_by_name
    FROM payments p LEFT JOIN users u ON u.id=p.received_by WHERE p.invoice_id=? ORDER BY p.id`).all(inv.id);
  return { invoice: inv, payments: rows, paid_amount: inv.paid_amount, due: dueOf(inv) };
}

// statement payload for the printable receipt (invoice + patient + payments)
function statement(invoice_id) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(+invoice_id);
  if (!inv) throw httpErr(404, 'NOT_FOUND', 'No such invoice.');
  const patient = inv.patient_id
    ? db.prepare('SELECT id,name,phone FROM patients WHERE id=?').get(inv.patient_id) || null : null;
  const planRow = inv.plan_id
    ? db.prepare('SELECT title,dentist_id FROM treatment_plans WHERE id=?').get(inv.plan_id) || null : null;
  const items = planRow ? db.prepare(`SELECT pi.visit_no,pi.tooth_fdi,pi.cost,pi.status,t.name AS treatment_name
      FROM plan_items pi LEFT JOIN treatments t ON t.id=pi.treatment_id WHERE pi.plan_id=? ORDER BY pi.visit_no,pi.id`).all(inv.plan_id) : [];
  const dentist = planRow
    ? (db.prepare('SELECT u.name FROM dentists d JOIN users u ON u.id=d.user_id WHERE d.id=?').get(planRow.dentist_id) || {}).name || null
    : null;
  const payments = db.prepare('SELECT amount,method,reference,created_at FROM payments WHERE invoice_id=? ORDER BY id').all(inv.id);
  const due = dueOf(inv);
  return { invoice: inv, patient, plan: planRow, items, dentist, due, payments };
}

// UPI deep link (no gateway keys needed — any UPI app can pay it; the clinic still
// records the payment manually through recordPayment).
function upiLink({ invoice_id, payee = 'DentEra', amount }) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(+invoice_id);
  if (!inv) throw httpErr(404, 'NOT_FOUND', 'No such invoice.');
  const amt = Math.round(+amount || dueOf(inv));
  const params = new URLSearchParams({ pa: 'dentera@upi', pn: payee, am: String(amt), cu: 'INR', tn: `Invoice #${inv.id}` });
  return { upi: `upi://pay?${params.toString().replace(/%40/g, '@')}`, amount: amt, invoice_id: inv.id };
}

// ---------- expenses ----------
function addExpense(u, b = {}) {
  const cat = EXPENSE_CATS.includes(b.category) ? b.category : 'other';
  const desc = String(b.description || '').trim().slice(0, 160);
  const amount = Math.round(+b.amount);
  if (!desc) throw httpErr(400, 'BAD_REQUEST', 'Please describe the expense.');
  if (!Number.isFinite(amount) || amount <= 0) throw httpErr(400, 'BAD_REQUEST', 'Enter an amount greater than zero.');
  const spent = /^\d{4}-\d{2}-\d{2}$/.test(b.spent_at || '') ? b.spent_at : localDay(0);
  const id = db.prepare('INSERT INTO expenses(category,description,amount,spent_at,created_by) VALUES (?,?,?,?,?)')
    .run(cat, desc, amount, spent, u.sub).lastInsertRowid;
  push({ audience: 'staff', kind: 'expense', title: `Expense logged — ₹${amount}`, body: `${cat}: ${desc}`, link: '#/admin' });
  return { id, category: cat, description: desc, amount, spent_at: spent };
}

function listExpenses({ from, to } = {}) {
  const f = /^\d{4}-\d{2}-\d{2}$/.test(from || '') ? from : '0000-01-01';
  const t = /^\d{4}-\d{2}-\d{2}$/.test(to || '') ? to : '9999-12-31';
  return db.prepare(`SELECT e.*, u.name AS created_by_name FROM expenses e LEFT JOIN users u ON u.id=e.created_by
    WHERE e.spent_at BETWEEN ? AND ? ORDER BY e.spent_at DESC, e.id DESC LIMIT 200`).all(f, t);
}

// ---------- inventory ----------
function listInventory() {
  return db.prepare(`SELECT i.*, CASE WHEN i.stock_qty <= i.min_qty THEN 1 ELSE 0 END AS low
    FROM inventory_items i ORDER BY i.name`).all();
}

function addInventoryItem(u, b = {}) {
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) throw httpErr(400, 'BAD_REQUEST', 'Please name the item.');
  const id = db.prepare(`INSERT INTO inventory_items(name,unit,stock_qty,min_qty,unit_cost) VALUES (?,?,?,?,?)`)
    .run(name, String(b.unit || 'pcs').slice(0, 12), Math.max(0, Math.round(+b.stock_qty || 0)),
      Math.max(0, Math.round(+b.min_qty || 0)), Math.max(0, Math.round(+b.unit_cost || 0))).lastInsertRowid;
  return { id, name };
}

// stock in/out with a reason; returns the item's new state
function moveInventory(u, { item_id, delta, reason }) {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id=?').get(+item_id);
  if (!item) throw httpErr(404, 'NOT_FOUND', 'Unknown item.');
  const d = Math.round(+delta);
  if (!Number.isFinite(d) || d === 0) throw httpErr(400, 'BAD_REQUEST', 'Enter a non-zero quantity change.');
  const next = Math.max(0, item.stock_qty + d);
  const tx = db.transaction(() => {
    db.prepare("UPDATE inventory_items SET stock_qty=?, updated_at=datetime('now') WHERE id=?").run(next, item.id);
    db.prepare('INSERT INTO inventory_moves(item_id,delta,reason,created_by) VALUES (?,?,?,?)')
      .run(item.id, d, reason ? String(reason).slice(0, 120) : null, u.sub);
  });
  tx();
  if (next <= item.min_qty) push({ audience: 'staff', kind: 'inventory', title: `Low stock — ${item.name}`,
    body: `${next} ${item.unit} left (minimum ${item.min_qty})`, link: '#/admin' });
  return { id: item.id, name: item.name, stock_qty: next, min_qty: item.min_qty, low: next <= item.min_qty };
}

function inventoryMoves(item_id) {
  return db.prepare(`SELECT m.*, u.name AS user_name FROM inventory_moves m LEFT JOIN users u ON u.id=m.created_by
    WHERE m.item_id=? ORDER BY m.id DESC LIMIT 50`).all(+item_id);
}

// profit & loss (cash basis): money received minus money spent over a window
function pnl({ from, to } = {}) {
  const f = /^\d{4}-\d{2}-\d{2}$/.test(from || '') ? from : localDay(-30);
  const t = /^\d{4}-\d{2}-\d{2}$/.test(to || '') ? to : localDay(0);
  const income = db.prepare('SELECT COALESCE(SUM(amount),0) c FROM payments WHERE created_at BETWEEN ? AND ?')
    .get(f + ' 00:00', t + ' 23:59').c;
  const byMethod = db.prepare(`SELECT method, SUM(amount) c FROM payments WHERE created_at BETWEEN ? AND ?
    GROUP BY method ORDER BY c DESC`).all(f + ' 00:00', t + ' 23:59');
  const expense = db.prepare('SELECT COALESCE(SUM(amount),0) c FROM expenses WHERE spent_at BETWEEN ? AND ?').get(f, t).c;
  const byCat = db.prepare(`SELECT category, SUM(amount) c FROM expenses WHERE spent_at BETWEEN ? AND ?
    GROUP BY category ORDER BY c DESC`).all(f, t);
  const outstanding = db.prepare("SELECT COALESCE(SUM(amount-discount-paid_amount),0) c FROM invoices WHERE status!='paid'").get().c;
  return { from: f, to: t, income, expense, profit: income - expense, by_method: byMethod, by_category: byCat, outstanding };
}

module.exports = { METHODS, EXPENSE_CATS, dueOf, listInvoices, recordPayment, paymentsOf, statement, upiLink,
  addExpense, listExpenses, listInventory, addInventoryItem, moveInventory, inventoryMoves, pnl };
