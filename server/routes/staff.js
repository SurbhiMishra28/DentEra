// server/routes/staff.js — staff notification bell (list / mark read) and the SSE
// stream that pushes live events (bookings, payments, low stock, reminders) to open
// dashboards. Any signed-in staff role (dentist, admin, reception) may connect.
// Guards are applied per-route: path arrays in router.use would match nothing useful
// here because the router is mounted at /api with several distinct prefixes.
'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const notify = require('../services/notify');

const router = express.Router();

const staff = req => {
  const u = requireAuth(req);
  if (!['dentist', 'admin', 'reception'].includes(u.role))
    throw Object.assign(new Error('Staff only.'), { status: 403, err: 'FORBIDDEN' });
  return u;
};
const guard = (req, res, next) => {
  try { staff(req); next(); }
  catch (e) { res.status(e.status || 401).json({ ok: false, error: e.err || 'AUTH_REQUIRED', message: e.message }); }
};

router.get('/notifications', guard, h((req, res) => {
  const scope = { audience: 'staff' };
  res.json({ ok: true, data: notify.list(scope), unread: notify.unreadCount(scope) });
}));

router.post('/notifications/read', guard, h((req, res) => {
  const { id } = req.body || {};
  if (id) notify.markRead(+id); else notify.markAllRead({ audience: 'staff' });
  res.json({ ok: true });
}));

// SSE — EventSource rides the dent_token cookie (same-origin), so identity is the JWT
router.get('/stream', guard, (req, res) => notify.subscribe(req, res, 'staff'));

module.exports = router;
