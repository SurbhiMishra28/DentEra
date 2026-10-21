// server/services/backup.js — SQLite backups (the pragmatic answer to Render's
// ephemeral disk): a consistent .backup() snapshot, on a schedule and on demand,
// keeping the newest KEEP files. Postgres remains the answer for durable storage.
'use strict';
const fs = require('fs');
const path = require('path');
const { db, dbFile } = require('../db/connection');
const { push } = require('./notify');

const DIR = path.join(__dirname, '..', 'db', 'backups');
const KEEP = 7;

function backups() {
  fs.mkdirSync(DIR, { recursive: true });
  return fs.readdirSync(DIR).filter(f => f.endsWith('.db'))
    .map(f => { const s = fs.statSync(path.join(DIR, f)); return { name: f, bytes: s.size, created_at: s.mtime.toISOString() }; })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function create(reason = 'manual') {
  fs.mkdirSync(DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(DIR, `dental-${stamp}.db`);
  if (typeof db.backup === 'function') await db.backup(file);
  else { fs.copyFileSync(dbFile, file); } // older driver: plain copy is still better than nothing
  const files = backups();
  for (const f of files.slice(KEEP)) { try { fs.unlinkSync(path.join(DIR, f.name)); } catch { /* keep going */ } }
  push({ audience: 'staff', kind: 'backup', title: 'Database backup created',
    body: path.basename(file) + (reason === 'auto' ? ' (scheduled)' : ''), link: '#/admin' });
  return { name: path.basename(file), bytes: fs.statSync(file).size, kept: backups().length };
}

// daily at ~03:15 local; the first one runs 10 minutes after boot, then every 24h
function startSchedule() {
  const tick = async () => { try { await create('auto'); } catch (e) { console.warn('[dentera] backup failed:', e.message); } };
  setTimeout(tick, 10 * 60 * 1000).unref?.();
  setInterval(tick, 24 * 3600 * 1000).unref?.();
}

module.exports = { create, backups, startSchedule, DIR };
