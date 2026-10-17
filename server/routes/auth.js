// server/routes/auth.js — login (DOCTORS + ADMIN only) / logout / me / demo-login.
// No auto-signup: an unknown email/username is rejected — accounts exist only via the seed
// (2 demo doctors) and ensureAdmin (username 'admin'). Throttle = TWO counters (Era's lesson): per (IP+email) clears on that account's success;
// per IP never clears (one colleague logging in must not re-arm an attacker).
'use strict';
const express = require('express');
const { db } = require('../db/connection');
const { mintToken, verifyJWT, requireAuth, bcrypt } = require('../middleware/auth');
const { h } = require('../middleware/helpers');
const { audit } = require('../services/audit');

const router = express.Router();
const tries = new Map();
const ipOf = req => String((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
const PRUNE = (k, now, w) => (tries.get(k) || []).filter(ts => now - ts < w);
const W = 15 * 60 * 1000, PAIR_MAX = 8, IP_MAX = 30;

function tooMany(req, email) {
  const now = Date.now();
  const pair = ipOf(req) + '|' + email.toLowerCase();
  const hit = PRUNE(pair, now, W); tries.set(pair, hit);
  if (hit.length >= PAIR_MAX) return Math.ceil((W - (now - hit[0])) / 1000);
  const h2 = PRUNE(ipOf(req), now, W); tries.set(ipOf(req), h2);
  if (h2.length >= IP_MAX) return Math.ceil((W - (now - h2[0])) / 1000);
  return 0;
}
const noteFail = (req, email) => { const now = Date.now();
  const pair = ipOf(req) + '|' + email.toLowerCase();
  tries.set(pair, PRUNE(pair, now, W).concat(now));
  tries.set(ipOf(req), PRUNE(ipOf(req), now, W).concat(now)); };

// Secure only when the request really is TLS (Render sets x-forwarded-proto). Marking it Secure on
// plain-HTTP localhost makes browsers/agents drop the cookie → instant 401 loop (Era's isTLS rule).
const isTLS = req => !!req.secure || /^https/i.test(String(req.headers['x-forwarded-proto'] || ''));
const cookieFor = req => ({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 3600 * 1000, secure: isTLS(req) });
const profileOf = u => {
  const d = db.prepare('SELECT id,specialty FROM dentists WHERE user_id=?').get(u.id);
  return { id: u.id, name: u.name, role: u.role, dentistId: d ? d.id : null, specialty: d ? d.specialty : null };
};

router.post('/login', h((req, res, reqId) => {
  const identity = String((req.body || {}).email || '').toLowerCase().trim(); // email OR username ('admin')
  const password = String((req.body || {}).password || '');
  const wait = tooMany(req, identity);
  if (wait) { audit(null, null, 'login_throttled', null, reqId, false, null, 'auth', null);
    return res.status(429).json({ ok: false, error: 'TOO_MANY_ATTEMPTS', retry_after_s: wait,
      message: 'Too many sign-in attempts. Please wait a minute and try again.' }); }
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identity);
  const isUsername = /^[a-z0-9][a-z0-9._-]{2,31}$/.test(identity);
  if (!isEmail && !isUsername) throw Object.assign(new Error('Please enter a valid email address or username.'), { status: 400, err: 'BAD_REQUEST' });
  if (password.length < 4) throw Object.assign(new Error('Please use a password with at least 4 characters.'), { status: 400, err: 'BAD_REQUEST' });
  const row = db.prepare('SELECT * FROM users WHERE email=?').get(identity);
  // doctors + the admin only — unknown users, password-less rows and any other role are all rejected
  if (!row || !row.password_hash || !['dentist', 'admin'].includes(row.role)) {
    noteFail(req, identity);
    audit(row ? row.id : null, null, 'login_failed', null, reqId, false, null, 'auth', row ? row.id : null);
    throw Object.assign(new Error('Only registered doctors and the clinic admin can sign in to DentEra.'), { status: 401, err: 'BAD_CREDENTIALS' });
  }
  if (!bcrypt.compareSync(password, row.password_hash)) { noteFail(req, identity);
    audit(row.id, null, 'login_failed', null, reqId, false, null, 'auth', row.id);
    throw Object.assign(new Error('Wrong password for this account. Please try again.'), { status: 401, err: 'BAD_CREDENTIALS' }); }
  const prof = profileOf(row);
  const t = mintToken(prof, prof.dentistId);
  audit(row.id, prof.dentistId, 'login', null, reqId, true, null, 'auth', row.id);
  return res.cookie('dent_token', t, cookieFor(req)).status(200).json({ ok: true, token: t, user: prof });
}));

router.post('/logout', h((req, res, reqId) => {
  const u = verifyJWT(req);
  if (u) audit(u.sub, u.dentistId, 'logout', null, reqId, true, null, 'auth', u.sub);
  return res.clearCookie('dent_token', { path: '/' }).status(200).json({ ok: true });
}));

router.get('/me', h((req, res) => {
  const u = requireAuth(req);
  return res.status(200).json({ ok: true, user: profileOf(db.prepare('SELECT * FROM users WHERE id=?').get(u.sub) || {}) });
}));

// demo personas (DEMO_LOGIN=1) — for the bundled UI and reviewers
router.post('/demo-login', h((req, res, reqId) => {
  if (process.env.DEMO_LOGIN === '0') return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  const who = String((req.body || {}).who || '');
  const map = { dentistA: 'meera@dental.local', dentistB: 'arjun@dental.local' }; // demo = 2 doctors only; admin ALWAYS signs in with username+password
  const email = map[who];
  if (!email) throw Object.assign(new Error('Unknown demo user.'), { status: 400, err: 'BAD_REQUEST' });
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u) throw Object.assign(new Error('Demo user missing — seed the DB first.'), { status: 404, err: 'NOT_FOUND' });
  if (!['dentist', 'admin'].includes(u.role)) throw Object.assign(new Error('Only doctors and the admin can sign in.'), { status: 403, err: 'FORBIDDEN' });
  const prof = profileOf(u);
  const t = mintToken(prof, prof.dentistId);
  audit(u.id, prof.dentistId, 'demo_login', null, reqId, true, null, 'auth', u.id);
  return res.cookie('dent_token', t, cookieFor(req)).status(200).json({ ok: true, token: t, user: prof });
}));

module.exports = router;
