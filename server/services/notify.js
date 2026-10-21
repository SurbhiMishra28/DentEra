// server/services/notify.js — in-app notifications + a tiny SSE hub (live updates).
// push() writes a notifications row AND fans it out to connected dashboard/admin clients,
// so a public booking or a received payment shows up without a page refresh.
'use strict';
const { db } = require('../db/connection');

const clients = new Set(); // { res, audience } — 'all' | 'staff' | 'dentist' | 'patient'

function push({ audience = 'staff', userId = null, kind = 'info', title = '', body = '', link = null }) {
  let id = null;
  try {
    id = db.prepare('INSERT INTO notifications(audience,user_id,kind,title,body,link) VALUES (?,?,?,?,?,?)')
      .run(audience, userId ?? null, String(kind).slice(0, 40),
        String(title || '').slice(0, 140), body ? String(body).slice(0, 300) : null,
        link ? String(link).slice(0, 140) : null).lastInsertRowid;
  } catch (e) { console.warn('[dentera] notification row skipped:', e.message); }
  const row = db.prepare('SELECT id,audience,user_id,kind,title,body,link,read_at,created_at FROM notifications WHERE id=?').get(id);
  if (row) {
    const frame = `data: ${JSON.stringify(row)}\n\n`;
    for (const c of [...clients]) {
      if (c.audience !== 'all' && row.audience !== 'staff' && c.audience !== row.audience) continue;
      try { c.res.write(frame); } catch { clients.delete(c); }
    }
  }
  return id;
}

// SSE: EventSource can't set headers, so identity comes from the dent_token cookie
function subscribe(req, res, audience) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive', 'X-Accel-Buffering': 'no'
  });
  res.write(`retry: 3000\n\n`);
  const client = { res, audience };
  clients.add(client);
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* gone */ } }, 25000);
  req.on('close', () => { clearInterval(ping); clients.delete(client); });
}

function list({ audience = 'staff', userId = null, limit = 30 } = {}) {
  return db.prepare(`SELECT id,audience,user_id,kind,title,body,link,read_at,created_at FROM notifications
    WHERE audience=? OR (audience='patient' AND user_id IS ?)
    ORDER BY id DESC LIMIT ?`).all(audience, userId ?? null, Math.min(limit, 100));
}

function unreadCount({ audience = 'staff', userId = null } = {}) {
  return db.prepare(`SELECT COUNT(*) c FROM notifications
    WHERE read_at IS NULL AND (audience=? OR (audience='patient' AND user_id IS ?))`).get(audience, userId ?? null).c;
}

function markRead(id) {
  return db.prepare("UPDATE notifications SET read_at=datetime('now') WHERE id=? AND read_at IS NULL").run(id).changes;
}

function markAllRead({ audience = 'staff', userId = null } = {}) {
  return db.prepare(`UPDATE notifications SET read_at=datetime('now') WHERE read_at IS NULL
    AND (audience=? OR (audience='patient' AND user_id IS ?))`).run(audience, userId ?? null).changes;
}

module.exports = { push, subscribe, list, unreadCount, markRead, markAllRead };
