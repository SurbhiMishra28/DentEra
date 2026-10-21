// server/services/clinical.js — clinical records beyond the tooth chart:
// document uploads (X-rays, reports), prescriptions, and periodontal charting.
// Ownership: dentists only touch their own patients; admins/reception read the register.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, localDay } = require('../db/connection');
const { httpErr } = require('../middleware/auth');
const { assertPatientMine } = require('./tools');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 6 * 1024 * 1024;
const MIME_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

// patient must be ours (dentists) — admin/reception bypass like the assistant tools do
function assertPatientAllowed(u, patientId) {
  if (u.role === 'dentist') assertPatientMine(u.dentistId, patientId);
  if (!db.prepare('SELECT id FROM patients WHERE id=?').get(+patientId))
    throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
}

// ---------- documents (base64 JSON upload; files land outside the web root) ----------
function saveDocument(u, { patient_id, tooth_fdi, kind, filename, mime, data }) {
  assertPatientAllowed(u, patient_id);
  const b64 = String(data || '').includes(',') ? String(data).split(',')[1] : String(data || '');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) throw httpErr(400, 'BAD_FILE', 'The uploaded file is empty.');
  if (buf.length > MAX_BYTES) throw httpErr(400, 'BAD_FILE', 'Files must be 6 MB or smaller.');
  const type = String(mime || 'application/octet-stream');
  if (!MIME_OK.includes(type)) throw httpErr(400, 'BAD_FILE', 'Only JPG, PNG, WEBP, GIF or PDF files.');
  const safe = String(filename || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60) || 'file';
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const stored = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), buf);
  const id = db.prepare(`INSERT INTO documents(patient_id,tooth_fdi,kind,filename,mime,bytes,stored_name,uploaded_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(+patient_id, tooth_fdi ? String(tooth_fdi) : null,
      String(kind || 'other'), safe, type, buf.length, stored, u.sub).lastInsertRowid;
  return { id, filename: safe, kind: kind || 'other', bytes: buf.length };
}

function listDocuments(u, patient_id) {
  assertPatientAllowed(u, patient_id);
  return db.prepare(`SELECT d.id,d.patient_id,d.tooth_fdi,d.kind,d.filename,d.mime,d.bytes,d.created_at,u.name AS uploaded_by_name
    FROM documents d LEFT JOIN users u ON u.id=d.uploaded_by
    WHERE d.patient_id=? ORDER BY d.id DESC`).all(+patient_id);
}

function readDocument(u, docId) {
  const doc = db.prepare('SELECT * FROM documents WHERE id=?').get(+docId);
  if (!doc) throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
  assertPatientAllowed(u, doc.patient_id);
  const file = path.join(UPLOAD_DIR, doc.stored_name);
  if (!fs.existsSync(file)) throw httpErr(410, 'FILE_GONE', 'That file is no longer on the server.');
  return { doc, file };
}

function deleteDocument(u, docId) {
  const { doc, file } = readDocument(u, docId); // ownership enforced here
  db.prepare('DELETE FROM documents WHERE id=?').run(doc.id);
  try { fs.unlinkSync(file); } catch { /* already gone */ }
  return { deleted: true, id: doc.id };
}

// ---------- prescriptions ----------
function createPrescription(u, { patient_id, appointment_id, diagnosis, advice, items }) {
  assertPatientAllowed(u, patient_id);
  const list = (Array.isArray(items) ? items : []).filter(it => String(it.medicine || '').trim());
  if (!list.length) throw httpErr(400, 'BAD_REQUEST', 'Add at least one medicine.');
  const tx = db.transaction(() => {
    const rxId = db.prepare(`INSERT INTO prescriptions(patient_id,dentist_id,appointment_id,diagnosis,advice)
      VALUES (?,?,?,?,?)`).run(+patient_id, u.dentistId || null, appointment_id ? +appointment_id : null,
        diagnosis ? String(diagnosis).slice(0, 200) : null, advice ? String(advice).slice(0, 300) : null).lastInsertRowid;
    const ins = db.prepare('INSERT INTO prescription_items(prescription_id,medicine,dose,frequency,days) VALUES (?,?,?,?,?)');
    list.forEach(it => ins.run(rxId, String(it.medicine).slice(0, 120),
      it.dose ? String(it.dose).slice(0, 40) : null,
      it.frequency ? String(it.frequency).slice(0, 60) : null,
      Number.isFinite(+it.days) && it.days !== '' ? Math.max(1, Math.round(+it.days)) : null));
    return rxId;
  });
  return { prescription_id: tx(), items: list.length };
}

function listPrescriptions(u, patient_id) {
  assertPatientAllowed(u, patient_id);
  return db.prepare(`SELECT r.*, u.name AS dentist_name FROM prescriptions r
    LEFT JOIN dentists d ON d.id=r.dentist_id LEFT JOIN users u ON u.id=d.user_id
    WHERE r.patient_id=? ORDER BY r.id DESC`).all(+patient_id);
}

function prescriptionPrint(u, prescription_id) {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id=?').get(+prescription_id);
  if (!rx) throw httpErr(404, 'NOT_FOUND', 'You are not authorized to access this resource.');
  assertPatientAllowed(u, rx.patient_id);
  const patient = db.prepare('SELECT id,name,dob,phone FROM patients WHERE id=?').get(rx.patient_id) || null;
  const items = db.prepare('SELECT medicine,dose,frequency,days FROM prescription_items WHERE prescription_id=? ORDER BY id').all(rx.id);
  const dentist = rx.dentist_id
    ? (db.prepare('SELECT u.name,d.specialty FROM dentists d JOIN users u ON u.id=d.user_id WHERE d.id=?').get(rx.dentist_id) || null)
    : null;
  return { prescription: rx, patient, items, dentist };
}

// ---------- periodontal charting (6 sites per tooth) ----------
const SITES = [1, 2, 3, 4, 5, 6];

function savePerio(u, { patient_id, tooth_fdi, visit_date, notes, sites }) {
  assertPatientAllowed(u, patient_id);
  const tooth = String(tooth_fdi || '').trim();
  if (!/^\d{2}$/.test(tooth)) throw httpErr(400, 'BAD_REQUEST', 'A tooth number like 36 is required.');
  const rows = (Array.isArray(sites) ? sites : []).filter(s => Number.isFinite(+s.site));
  if (!rows.length) throw httpErr(400, 'BAD_REQUEST', 'Record at least one site.');
  const day = /^\d{4}-\d{2}-\d{2}$/.test(visit_date || '') ? visit_date : localDay(0);
  const tx = db.transaction(() => {
    const recId = db.prepare(`INSERT INTO perio_records(patient_id,dentist_id,tooth_fdi,visit_date,notes)
      VALUES (?,?,?,?,?)`).run(+patient_id, u.dentistId || null, tooth, day,
        notes ? String(notes).slice(0, 200) : null).lastInsertRowid;
    const ins = db.prepare('INSERT INTO perio_measurements(record_id,site,pocket_depth,bleeding,recession) VALUES (?,?,?,?,?)');
    rows.forEach(s => {
      const idx = Math.round(+s.site);
      if (!SITES.includes(idx)) throw httpErr(400, 'BAD_REQUEST', 'Sites are numbered 1 to 6.');
      const pd = Math.round(+s.pocket_depth);
      if (!Number.isFinite(pd) || pd < 0 || pd > 15) throw httpErr(400, 'BAD_REQUEST', 'Pocket depth must be 0–15 mm.');
      ins.run(recId, idx, pd, s.bleeding ? 1 : 0, Math.max(0, Math.round(+s.recession || 0)));
    });
    return recId;
  });
  return { record_id: tx(), tooth_fdi: tooth, visit_date: day, sites: rows.length };
}

// latest measurement per site per tooth → { '36': { sites: {1:..}, max_pd, avg_pd, bleeding } }
function perioSummary(u, patient_id) {
  assertPatientAllowed(u, patient_id);
  const rows = db.prepare(`SELECT r.tooth_fdi, r.visit_date, r.notes, m.site, m.pocket_depth, m.bleeding, m.recession
    FROM perio_records r JOIN perio_measurements m ON m.record_id = r.id
    WHERE r.patient_id=? ORDER BY r.id`).all(+patient_id);
  const byTooth = {};
  for (const r of rows) {
    const t = byTooth[r.tooth_fdi] || (byTooth[r.tooth_fdi] = { tooth_fdi: r.tooth_fdi, visit_date: r.visit_date, notes: r.notes, sites: {} });
    t.visit_date = r.visit_date; // later rows win (latest record)
    t.sites[r.site] = { pocket_depth: r.pocket_depth, bleeding: !!r.bleeding, recession: r.recession };
  }
  for (const t of Object.values(byTooth)) {
    const pds = Object.values(t.sites).map(s => s.pocket_depth);
    t.max_pd = Math.max(...pds);
    t.avg_pd = +(pds.reduce((a, b) => a + b, 0) / pds.length).toFixed(1);
    t.bleeding = Object.values(t.sites).filter(s => s.bleeding).length;
    t.health = t.max_pd >= 5 ? 'severe' : t.max_pd >= 4 ? 'moderate' : 'mild';
  }
  return { patient_id: +patient_id, teeth: Object.values(byTooth), byTooth };
}

module.exports = { saveDocument, listDocuments, readDocument, deleteDocument,
  createPrescription, listPrescriptions, prescriptionPrint, savePerio, perioSummary, MAX_BYTES, MIME_OK };
