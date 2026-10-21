// server/routes/clinical.js — documents (X-rays/reports), prescriptions and
// periodontal charting. Mounted under /api; identity from req.auth, ownership in
// the service layer (dentists: own patients; admin/reception: full register).
// The auth guard is PATH-SCOPED (a bare router.use would guard every /api call).
'use strict';
const express = require('express');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const { audit } = require('../services/audit');
const clinical = require('../services/clinical');

const router = express.Router();

const guard = (req, res, next) => {
  try { req.auth = requireAuth(req); next(); }
  catch (e) { res.status(401).json({ ok: false, error: 'AUTH_REQUIRED', message: e.message }); }
};
router.use(['/documents', '/patients', '/prescriptions', '/chart'], guard);

// ---------- documents ----------
// upload (base64 JSON, ≤6 MB) — a bigger JSON limit is mounted for this path in index.js
router.post('/documents', h((req, res, reqId) => {
  const out = clinical.saveDocument(req.auth, req.body || {});
  audit(req.auth.sub, req.auth.dentistId, 'create', 'documents', reqId, true,
    `${out.kind}: ${out.filename}`, 'documents', out.id);
  res.status(201).json({ ok: true, data: out });
}));

router.get('/patients/:id/documents', h((req, res, reqId) => {
  const rows = clinical.listDocuments(req.auth, +req.params.id);
  audit(req.auth.sub, req.auth.dentistId, 'list', 'documents', reqId, true, null, 'documents', null);
  res.json({ ok: true, data: rows });
}));

// stream the file itself — files never live under a public static path
router.get('/documents/:id/file', h((req, res, reqId) => {
  const { doc, file } = clinical.readDocument(req.auth, +req.params.id);
  audit(req.auth.sub, req.auth.dentistId, 'get', 'documents', reqId, true, doc.filename, 'documents', doc.id);
  res.setHeader('Content-Type', doc.mime);
  res.setHeader('Content-Disposition', `inline; filename="${doc.filename.replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  fs.createReadStream(file).pipe(res);
}));

router.delete('/documents/:id', h((req, res, reqId) => {
  const out = clinical.deleteDocument(req.auth, +req.params.id);
  audit(req.auth.sub, req.auth.dentistId, 'delete', 'documents', reqId, true, null, 'documents', out.id);
  res.json({ ok: true, data: out });
}));

// ---------- prescriptions ----------
router.post('/prescriptions', h((req, res, reqId) => {
  const out = clinical.createPrescription(req.auth, req.body || {});
  audit(req.auth.sub, req.auth.dentistId, 'create', 'prescriptions', reqId, true, null, 'prescriptions', out.prescription_id);
  res.status(201).json({ ok: true, data: out });
}));

router.get('/patients/:id/prescriptions', h((req, res) => {
  res.json({ ok: true, data: clinical.listPrescriptions(req.auth, +req.params.id) });
}));

router.get('/prescriptions/:id', h((req, res, reqId) => {
  const out = clinical.prescriptionPrint(req.auth, +req.params.id);
  audit(req.auth.sub, req.auth.dentistId, 'get', 'prescriptions', reqId, true, null, 'prescriptions', out.prescription.id);
  res.json({ ok: true, data: out });
}));

// ---------- periodontal charting ----------
router.get('/chart/:patientId/perio', h((req, res, reqId) => {
  const out = clinical.perioSummary(req.auth, +req.params.patientId);
  audit(req.auth.sub, req.auth.dentistId, 'get', 'perio', reqId, true, null, 'chart', +req.params.patientId);
  res.json({ ok: true, data: out });
}));

router.post('/chart/:patientId/perio', h((req, res, reqId) => {
  const out = clinical.savePerio(req.auth, { patient_id: +req.params.patientId, ...(req.body || {}) });
  audit(req.auth.sub, req.auth.dentistId, 'create', 'perio', reqId, true, `tooth ${out.tooth_fdi}`, 'chart', +req.params.patientId);
  res.status(201).json({ ok: true, data: out });
}));

module.exports = router;
