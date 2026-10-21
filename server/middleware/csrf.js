// server/middleware/csrf.js — cheap, effective CSRF guard for the cookie session.
// The auth cookie is SameSite=Lax (no cross-site cookie on POST), and this adds an
// Origin allow-check: a state-changing request carrying the dent_token cookie must come
// from our own origin (or a dev origin already allowed by CORS_ORIGIN, e.g. Vite's :5173).
// Non-browser clients (no Origin header, or Bearer tokens) pass — they cannot ride a
// browser session in the first place.
'use strict';

const RAW = String(process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8100')
  .split(',').map(s => s.trim()).filter(Boolean);

function hostOf(url) {
  const m = /^https?:\/\/([^/]+)/i.exec(String(url || ''));
  return m ? m[1].toLowerCase() : '';
}

// allowed hosts = whatever CORS already allows (Vite's :5173 included) + our own host
const ALLOWED_HOSTS = new Set(RAW.map(hostOf).filter(Boolean));

function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!/(?:^|;\s*)dent_token=/.test(req.headers.cookie || '')) return next(); // no browser session
  const from = hostOf(req.headers.origin) || hostOf(req.headers.referer);
  if (!from) return next(); // non-browser client (curl, tests, bearer tokens)
  const ours = hostOf(`${req.protocol}://${req.headers.host || ''}`);
  if ((ours && from === ours) || ALLOWED_HOSTS.has(from)) return next();
  return res.status(403).json({ ok: false, error: 'CSRF_BLOCKED',
    message: 'This request did not come from the DentEra app — blocked for your safety.' });
}

module.exports = { csrfGuard, ALLOWED_HOSTS };
