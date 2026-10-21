// server/routes/insights.js — a dentist's own practice numbers: revenue trend,
// top treatments, utilisation, no-show rate and the recall list. Admin/reception
// read the whole clinic through /api/admin/*.
// The auth guard is PATH-SCOPED (a bare router.use would guard every /api call).
'use strict';
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const { audit } = require('../services/audit');
const analytics = require('../services/analytics');

const router = express.Router();

const guard = (req, res, next) => {
  try { req.auth = requireAuth(req); next(); }
  catch (e) { res.status(401).json({ ok: false, error: 'AUTH_REQUIRED', message: e.message }); }
};
router.use(['/analytics', '/recall'], guard);

const win = q => ({ from: q.from, to: q.to });

router.get('/analytics/summary', h((req, res, reqId) => {
  const out = analytics.summary(req.auth, win(req.query));
  audit(req.auth.sub, req.auth.dentistId, 'list', 'analytics_summary', reqId, true, null, 'analytics', null);
  res.json({ ok: true, data: out });
}));

router.get('/analytics/trend', h((req, res) => {
  res.json({ ok: true, data: analytics.trend(req.auth, win(req.query)) });
}));

router.get('/analytics/top-treatments', h((req, res) => {
  res.json({ ok: true, data: analytics.topTreatments(req.auth, win(req.query)) });
}));

router.get('/analytics/utilization', h((req, res) => {
  res.json({ ok: true, data: analytics.utilization(req.auth, win(req.query)) });
}));

// patients due for a check-up (never seen, or last completed visit older than months)
router.get('/recall', h((req, res, reqId) => {
  const out = analytics.recall(req.auth, { months: req.query.months });
  audit(req.auth.sub, req.auth.dentistId, 'list', 'recall', reqId, true, null, 'patients', null);
  res.json({ ok: true, data: out });
}));

module.exports = router;
