# DentEra — Rules

**Version:** 1.3.0 · **Date:** 2026-10-21
Inherits Era's [../Rules.md](../Rules.md) discipline. These rules are NON-NEGOTIABLE for `dental/`.

## 1. Security rules

1. **Identity comes ONLY from the JWT** (cookie or Bearer) — never from the request body or AI output.
   `scopeDentist()` overrides any client-sent `dentist_id`.
2. **Ownership in the WHERE clause** — every read/update/delete ends with `AND dentist_id=?` (or the
   `dentist_patients` join). Another dentist's chart/plan/invoice is a **404**, never a 403 that
   confirms existence.
3. **Parameterized queries only** — every value is a `?` placeholder. SQL injection must be inert (tested).
4. **Public booking is the only unauthenticated write** — and it is: rate-limited (5 attempts/10 min/IP),
   validated (name ≤120, phone regex `^[0-9+\-\s]{7,15}$`, date in next 14 days, time HH:MM),
   future-only, and checked against `slotClash` (interval overlap, not start equality).
5. **PHI never in URLs** — patient names go in bodies/JSON, not query strings. Audit rows may hold
   truncated details only (300 chars).
6. **Secrets stay out of git** — `.env`, `nvcf.key`, `certs/`, `*.db` are gitignored; `.env.example`
   carries placeholders.
7. **Audit everything** — login attempts, assistant tool calls, public bookings (pass + fail) AND every
   v1.3 state change (payments, expenses, inventory moves, prescriptions, perio rows, reminders,
   staff changes, backups) all write `assistant_audit` with `request_id`.
8. **Portal isolation** — the patient portal is authenticated but separate: a phone (+dob) JWT that
   carries `patientId` only; every portal query ends with `AND patient_id=?`; a staff token on a
   portal route is a **403**, a patient token on a staff route is a 401/404 by role.

## 2. Code rules

1. **npm allowed (stack change, v1.1.0)** — server: Express + better-sqlite3 + bcryptjs + jsonwebtoken + cookie-parser + cors; client: Vite + React + React Router. Keep the list short and purposeful — no UI kits, no ORM.
2. **Additive migrations only** — new tables/columns are added, existing data is never destroyed or reshaped.
   The ONE exception ever taken (v1.3, `users`): a CHECK constraint had to widen for the `reception`/`patient`
   roles, so the table is rebuilt once (guarded by a schema check, ids and hashes preserved).
3. **Uploads never sit in the web root** — files land in `server/uploads/` and stream through an
   authenticated route; no static path ever exposes a patient file.
4. **One owner per concern** — schema `server/db/schema.sql`, identity `server/middleware/auth.js`,
   SQL ONLY in `server/services/` (`tools.js`, `money.js`, `clinical.js`, `analytics.js` — routes
   never touch tables directly), understanding `services/brain.js`, voice `services/tts.js`,
   plumbing `services/notify.js|audit.js|reminders.js|backup.js`, HTTP `routes/*.js`, UI `client/src/`.
5. **The brain never answers from thin air** — clinic data replies come from tools; the knowledge base
   only answers general dental questions and always appends the "visit your dentist" safety line.
6. **Every reply is speakable** — `toolReply()` produces human sentences (times as "11:00 AM", dates as
   "tomorrow"), because the assistant speaks them via Sofia.
7. **Check before done** — server: `node --check` + `npm test` green (scratch DB, 37 checks);
   client: `npm run build` passes + `node test/browsertest.js` zero console errors; new
   features add tests.
8. **Delete policy** — clinical history (tooth records, plans, invoices, payments) is NEVER hard-deleted.
   The only deletions allowed: junk appointments (soft cancel preferred), documents, one day of chat
   history, staff accounts (audit trail preserved).

## 3. Doc rules

1. Seven root docs describe ONLY this sub-project (Prd/Architecture/Design/Rules/Task/Memory/
   implementation + Features/Flows); Era root docs are a different product — never merge them.
   The generated guide set lives in `docs/` (Features-and-Flows[.md + Simple], Backend-Flow,
   Full-Flow) — keep it aligned whenever behaviour changes.
2. Version bumps: schema/behaviour change ⇒ bump root `package.json` version + the doc headers together.
3. Honest status marks: ❌ not built, 🔶 partial, ✅ done — no wishful ✅.
