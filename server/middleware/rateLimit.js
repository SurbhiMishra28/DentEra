// server/middleware/rateLimit.js — clinic-wide sliding-window limiter (Era's two-counter
// lesson, applied to the whole API). Health checks and the SSE stream are exempt.
// This is a BACKSTOP, not the front line: sign-in (8/15min) and public booking (5/10min)
// run their own stricter counters. A clinic SPA legitimately makes hundreds of calls a
// minute, so the per-IP caps are generous but finite (GET 600/min · writes 300/min).
'use strict';
const hits = new Map();
const W = 60 * 1000;
const GET_MAX = 600, WRITE_MAX = 300;

const ipOf = req => String((req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');

function sweep(map, now) {
  for (const [k, v] of map) {
    const live = v.filter(ts => now - ts < W);
    if (live.length) map.set(k, live); else map.delete(k);
  }
}

function limiter(req, res, next) {
  if (req.path === '/api/health' || req.path === '/api/stream') return next();
  const now = Date.now();
  const writes = new Map([...hits].filter(([k]) => k.startsWith('W|')));
  if (writes.size > 500) sweep(writes, now);
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const key = (isWrite ? 'W|' : 'R|') + ipOf(req);
  const arr = (hits.get(key) || []).filter(ts => now - ts < W);
  const max = isWrite ? WRITE_MAX : GET_MAX;
  if (arr.length >= max) {
    return res.status(429).json({ ok: false, error: 'TOO_MANY_ATTEMPTS',
      message: 'Too many requests — please slow down and try again in a moment.' });
  }
  arr.push(now);
  hits.set(key, arr);
  next();
}

module.exports = { limiter };
