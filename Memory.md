# DentEra — Memory (facts that must survive context loss)

**Version:** 1.3.0 · **Date:** 2026-10-21

## What this is
- **DentEra** = dental practice website (standalone repo `dentera/`) — the dental counterpart of the
  Era general clinic assistant. React (Vite, `client/`) + Express (`server/`) + better-sqlite3.
- Shipped v1.3.0 (2026-10-21): **30 features** (Features.md F1–F30) — dashboard, FDI chart, plans,
  billing + payments ledger, public booking, patient portal, documents/Rx/perio, reminders,
  analytics, admin console, notifications (SSE), backups, dark mode, static landing site.
- 26 tables (`server/db/schema.sql`); **37/37 server tests green** + browser E2E (`test/browsertest.js`).

## Hard decisions (do not re-litigate)
1. Dental runs on **port 8100**; Vite dev :5173 proxies `/api` → 8100; production = one Express
   process serving `client/dist`.
2. Public booking + health are the **only** unauthenticated API surface; rate-limited 5/10min/IP;
   `source='public'`. The patient portal (phone + dob, role `patient`) is authenticated but separate.
3. FDI tooth ids validated by `validTooth()` in `server/services/fdi.js` — adult 11–48 (quadrant 1–4 × 1–8),
   primary 55–85 (quadrant 5–8 × 1–5); anything else is a 400.
4. SQL lives in `server/services/` only (`tools.js` money/clinical/analytics); routes never touch raw
   tables. That containment IS the future Postgres migration path.
5. Uploads land in `server/uploads/` and stream through `GET /api/documents/:id/file` — never static.
6. Docs live in the repo root **plus** generated `docs/` guides (Features-and-Flows, Backend-Flow,
   Full-Flow, + Simple variant) — keep both sets aligned when behaviour changes.
7. Delete policy: clinical history (charts/plans/invoices/payments) is immutable; deletable = junk
   appointments, documents, chat days, staff accounts.

## Gotchas (learned the hard way)
- `.env` beats shell env — a `PORT=8971` on the command line will NOT override `.env`.
- Concurrent threads edit this repo — **re-read a file before editing it**, even mid-session
  (Features.md changed between read and write during the v1.3 doc pass).
- Git Bash on Windows: use `taskkill //F`, POSIX `rm -f`; repo-local scratch DBs via `ERA_DB=db/x.test.db`.
- Demo appointments are **re-dated on every boot** (freshness ritual) — don't "fix" that as data corruption.

## Test/demo facts
- Demo accounts: `meera@dental.local` + `arjun@dental.local` (dentists), `desk@dental.local`
  (reception) — password `password123`, gated by `DEMO_LOGIN` (dentistA/dentistB only).
- Portal sign-in: patient phone (+ dob when recorded) — no password.
- Verification ritual: `node --check` every touched file → `npm test` (scratch DB) →
  `npm run build` → `node test/browsertest.js` → curl smoke against `:8100/api/health`.
- Reminder delivery: `console` provider by default; `REMINDER_WEBHOOK_URL` relays to SMS/email/WhatsApp.
- TTS: `NVIDIA_API_KEY` optional — hosted Sofia, else browser/OS female voice fallback; text always works.
