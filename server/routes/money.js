// server/routes/money.js — payments with history, UPI deep links, practice expenses
// and consumable inventory. Mounted under /api. Identity always from req.auth:
// dentists touch their own patients, admin/reception work the whole clinic.
// The auth guard is PATH-SCOPED (a bare router.use would guard every /api call).
'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const { audit } = require('../services/audit');
const { assertPatientMine } = require('../services/tools');
const money = require('../services/money');

const router = express.Router();

const guard = (req, res, next) => {
  try { req.auth = requireAuth(req); next(); }
  catch (e) { res.status(401).json({ ok: false, error: 'AUTH_REQUIRED', message: e.message }); }
};
router.use(['/invoices', '/expenses', '/inventory', '/finance/pnl'], guard);

// ---------- payments ----------
router.post('/invoices/:id/payments', h((req, res, reqId) => {
  const out = money.recordPayment(req.auth, { invoice_id: +req.params.id, ...(req.body || {}) });
  audit(req.auth.sub, req.auth.dentistId, 'create', 'payments', reqId, true,
    `₹${out.amount} via ${out.method}`, 'invoices', out.invoice_id);
  res.status(201).json({ ok: true, data: out });
}));

router.get('/invoices/:id/payments', h((req, res) => {
  res.json({ ok: true, data: money.paymentsOf(req.auth, +req.params.id) });
}));

router.get('/invoices/:id/statement', h((req, res, reqId) => {
  const out = money.statement(+req.params.id);
  if (req.auth.role === 'dentist') assertPatientMine(req.auth.dentistId, out.invoice.patient_id); // their patient or 404
  audit(req.auth.sub, req.auth.dentistId, 'get', 'invoice_statement', reqId, true, null, 'invoices', out.invoice.id);
  res.json({ ok: true, data: out });
}));

router.get('/invoices/:id/upi', h((req, res) => {
  res.json({ ok: true, data: money.upiLink({ invoice_id: +req.params.id }) });
}));

// ---------- expenses ----------
router.get('/expenses', h((req, res) => {
  res.json({ ok: true, data: money.listExpenses({ from: req.query.from, to: req.query.to }) });
}));

router.post('/expenses', h((req, res, reqId) => {
  const out = money.addExpense(req.auth, req.body || {});
  audit(req.auth.sub, req.auth.dentistId, 'create', 'expenses', reqId, true, out.description, 'expenses', out.id);
  res.status(201).json({ ok: true, data: out });
}));

// ---------- inventory ----------
router.get('/inventory', h((req, res) => {
  res.json({ ok: true, data: money.listInventory() });
}));

router.post('/inventory', h((req, res, reqId) => {
  const out = money.addInventoryItem(req.auth, req.body || {});
  audit(req.auth.sub, req.auth.dentistId, 'create', 'inventory_items', reqId, true, out.name, 'inventory', out.id);
  res.status(201).json({ ok: true, data: out });
}));

router.post('/inventory/:id/move', h((req, res, reqId) => {
  const out = money.moveInventory(req.auth, { item_id: +req.params.id, ...(req.body || {}) });
  audit(req.auth.sub, req.auth.dentistId, 'update', 'inventory_items', reqId, true,
    `${out.delta >= 0 ? '+' : ''}${out.stock_qty}`, 'inventory', out.id);
  res.json({ ok: true, data: out });
}));

router.get('/inventory/:id/moves', h((req, res) => {
  res.json({ ok: true, data: money.inventoryMoves(+req.params.id) });
}));

// ---------- profit & loss ----------
router.get('/finance/pnl', h((req, res, reqId) => {
  const out = money.pnl({ from: req.query.from, to: req.query.to });
  audit(req.auth.sub, req.auth.dentistId, 'list', 'finance_pnl', reqId, true, null, 'finance', null);
  res.json({ ok: true, data: out });
}));

module.exports = router;
