# DentEra — Task board

**Version:** 1.3.1 · **Date:** 2026-10-21 · **Overall status: v1.3.1 SHIPPED (deployed to Render) — 37/37 server tests green, production build passes, browser E2E (landing / login / dashboard / week view / insights / dark mode / bell / patient portal / mobile 390px) green with zero console errors**
**Stack (v1.3.1): React + Express** — client = Vite React in `client/`, server = Express + better-sqlite3 in `server/`.

## Phase 0 — Planning ✅
- [x] Clarify placement (sub-project), features (all 4), AI (Era-style), stack (zero-dep)
- [x] Write the 7 planning docs (this set)
- [x] Write [Features.md](Features.md) (14 features with implementation) + [Flows.md](Flows.md) (full working flow + per-feature flows)

## FRONTEND track (client/) ✅
- [x] FE1 · Scaffold: `npm create vite@latest client -- --template react` + React Router + `vite.config.js` proxy `/api`→:8100 + mint theme tokens in `styles/`
- [x] FE2 · `api.js` fetch wrapper: `credentials:'include'`, JSON error shape, 401 → redirect `/login`
- [x] FE3 · `Login` page: email/username + password + demo persona select (2 doctors only) — sign-in only, no auto-signup, no admin demo
- [x] FE4 · `Dashboard`: DayView (today's appointments + `public` badge), StatsPills (patients/active plans/unpaid), patient search table, 60s polling
- [x] FE5 · `ToothChart` component: 32-tooth FDI grid (two rows of 8), colour legend, click → history panel + status/treatment actions, aria-labels per tooth
- [x] FE6 · `PatientDetail` page: chart + treatment plan timeline + invoice card (mark paid/partial)
- [x] FE7 · `PublicBooking` page (`/book`, no auth): 4 steps — dentist → date (14d) → slot grid → name/phone/reason + friendly 409 re-pick
- [x] FE8 · `ChatDrawer`: bubbles, per-day chips, send → POST chat, optional TTS playback button
- [x] FE9 · Build passes (`npm run build`), reduced-motion + focus-visible, Manrope font

## BACKEND track (server/) ✅
- [x] BE1 · Scaffold: `server/` Express app, middleware (cors with credentials, cookie-parser, 100KB JSON limit), env config, `/api/health`
- [x] BE2 · DB: `schema.sql` (15 tables) + `connection.js` (better-sqlite3, PRAGMA foreign_keys) + idempotent demo seed + appointment re-dating ritual
- [x] BE3 · `middleware/auth.js`: bcryptjs hash, JWT 8h in HttpOnly `dent_token`, requireAuth/requireRole/requireDentist, login throttle (8/15min per IP+email, 30/IP)
- [x] BE4 · Routes: auth (login/logout/me/demo) · patients (search + duplicate-phone return) · appointments CRUD with `slotClash` interval overlap
- [x] BE5 · Chart routes: `GET/POST /api/chart/:patientId` — `validTooth()` FDI check, patient-ownership verify, history append
- [x] BE6 · Plans + invoices routes: plan+items one-transaction insert, item status transitions, invoice partial/paid recompute
- [x] BE7 · Public booking: `GET /api/public/slots` + `POST /api/public/booking` — rate limit 5/10min/IP, validation, `source='public'`, slot-taken 409
- [x] BE8 · Assistant: `services/tools.js` 13 tools (scopeDentist bodyguard), `services/brain.js` intent ladder (writes before reads), `routes/assistant.js` chat + conversations API (per-day history, cross-user 404)
- [x] BE9 · TTS: `services/tts.js` Sofia proxy (HTTP×3→gRPC×2, LRU 20) + `/api/tts` + Sofia-only 400 guard
- [x] BE10 · Audit row on login/tool call/public booking/500, all with request_id

## DATABASE track ✅
- [x] DB1 · `schema.sql` — 15 tables: users, dentists, patients, dentist_patients, appointments, dentist_schedules, treatments, tooth_records, treatment_plans, plan_items, invoices, ai_doctor, assistant_audit, conversations, conversation_messages
- [x] DB2 · CHECK constraints: roles, appointment status (incl. `no_show`), tooth_status 7 values, invoice status, plan/item status
- [x] DB3 · Indexes: (dentist_id, appointment_date), tooth_records(patient_id), invoices(status), UNIQUE dentist_patients, UNIQUE conversations(user_id,day)
- [x] DB4 · FDI rule enforced in service layer (`validTooth`: adult 11–48, primary 55–85) before any tooth_records write
- [x] DB5 · Additive-migration policy documented + version bump ritual (schema change ⇒ bump VERSION + package.json)
- [x] DB6 · Scratch-DB test isolation (DB_FILE env → temp file, never real dental.db)

## Phase 7 — Tests + deploy ✅
- [x] `test/dental.test.js` supertest+node:test: **37 checks** (isolation, FDI, slot clash, booking limits, 401/404, chart scope, invoice status, portal, payments, perio, documents, reminders, backups, limiter, CSRF, staff) — ALL GREEN
- [x] `render.yaml` — Render Blueprint deploys the DentEra service (serves `client/dist` + API in one process)
- [x] Browser E2E `test/browsertest.js` — landing, login, dashboard, week view, insights, dark mode, bell, patient portal — zero console errors

## Known gaps (deliberate v1 deferrals)
- ~~Patient portal/login, payments gateway, X-ray uploads~~ — all shipped in v1.3.0 (see Features.md F16–F30)
- Child-teeth full grid: adult 11–48 only in the interactive chart (primary 55–85 already validates on the server)
- Postgres driver, hosted card gateway, SMS/WhatsApp direct gateway, Hindi UI — see [Features.md](Features.md) "Deliberately not built"

## v1.3.0 track (2026-10-21) — all ✅
- [x] BE11 · Schema v1.3: 11 new tables + users roles (`reception`, `patient`) with a guarded rebuild migration
- [x] BE12 · `services/money.js`: payments (append + recompute), payment history, statement, UPI link
- [x] BE13 · `services/money.js`: expenses + profit & loss (cash basis)
- [x] BE14 · `services/money.js`: inventory + stock moves + low-stock notifications
- [x] BE15 · `services/clinical.js`: document uploads (base64 → `server/uploads`, authed streaming)
- [x] BE16 · `services/clinical.js`: prescriptions (create/list/print payload)
- [x] BE17 · `services/clinical.js`: periodontal charting (6 sites per tooth + summary)
- [x] BE18 · `services/reminders.js`: generate/run/deliver (console + webhook providers), skip/custom
- [x] BE19 · `services/backup.js`: daily `db.backup()` snapshots (newest 7) + on demand
- [x] BE20 · `services/analytics.js`: trend, top treatments, utilisation, no-show rate, recall, summary
- [x] BE21 · `services/notify.js` + SSE hub (`/api/stream`) and in-app notifications
- [x] BE22 · `routes/portal.js`: patient sign-in (phone + dob), scoped portal API (visits, bills, chart, files, pay, book, cancel)
- [x] BE23 · `routes/clinical.js`, `routes/money.js`, `routes/insights.js`, `routes/staff.js`, admin analytics/recall/reminders/backups/staff
- [x] BE24 · Security: global rate-limit backstop + cookie-session CSRF guard
- [x] BE25 · Assistant: morning briefing, "move to the next free slot" (write), recall answers
- [x] FE10 · `Portal.jsx` + `portal.css` (phone + dob sign-in, visits, bills, records, files)
- [x] FE11 · Dashboard: week view (drag to move), insights (SVG trend), recall list, payment recording + UPI, bell, theme toggle
- [x] FE12 · PatientDetail: perio / files / prescriptions tabs (upload, print, per-tooth tagging)
- [x] FE13 · Admin: analytics, recall, expenses, inventory, reminders, staff, backups sections
- [x] FE14 · `dark.css` token overrides + `theme.js` (system default, persisted choice)
- [x] FE15 · Public booking triage ("what brings you in?" → reason + reserved length)
- [x] TEST2 · `dental.test.js` extended to 37 checks (portal, payments, perio, documents, reminders, backups, limiter, CSRF, staff)
- [x] E2E2 · `browsertest.js` extended: week view, insights, dark mode, bell, patient portal — zero console errors
- [x] DOC2 · Features.md v1.3 table + Task.md + README "What's new" + `.env.example` + version bump 1.3.0

## v1.3.1 track (2026-10-21) — mobile friendliness + login UX — all ✅
- [x] FE16 · Login: password visibility toggle (Eye/EyeOff), "I'm a patient" CTA card, bigger header tap targets
- [x] FE17 · Dashboard mobile (≤600px): stats in an even 2×2 grid (last card no longer spans), larger label text, 44px tap targets, off-canvas burger, icon-only secondary toolbar links, booking form stacks, week view 2 columns
- [x] FE18 · Admin/PatientDetail mobile: same tap-target + grid passes; clinical record tabs stacked with 40px targets
- [x] BUG · Signed-out patients visiting `#/portal` were bounced to the doctor login by the global 401 handler — portal endpoints are now exempt (api.js)
- [x] TEST3 · browser E2E extended with a mobile (390×844) pass: login (no overflow, CTA + toggle present) and dashboard (even stats, burger, bell, theme) — zero console errors
- [x] TOOL · `test/responsive-check.js`: one-command mobile audit (overflow / tiny text / tap targets) + full-page screenshot
- [x] DEPLOY · pushed to origin/main → Render (dentera-drjo.onrender.com) now serves the same code as this checkout
