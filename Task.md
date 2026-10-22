# DentEra — Task board

**Version:** 1.1.0 · **Date:** 2026-10-06 · **Overall status: BUILD COMPLETE (v1.1.0) — 16/16 tests green, SPA served, browser E2E pending final pass**
**Stack (v1.1.0): React + Express** — client = Vite React in `client/`, server = Express + better-sqlite3 in `server/`.

## Phase 0 — Planning ✅
- [x] Clarify placement (sub-project), features (all 4), AI (Era-style), stack (zero-dep)
- [x] Write the 7 planning docs (this set)
- [x] Write [Features.md](Features.md) (14 features with implementation) + [Flows.md](Flows.md) (full working flow + per-feature flows)

## FRONTEND track (client/) ❌
- [x] FE1 · Scaffold: `npm create vite@latest client -- --template react` + React Router + `vite.config.js` proxy `/api`→:8100 + mint theme tokens in `styles/`
- [x] FE2 · `api.js` fetch wrapper: `credentials:'include'`, JSON error shape, 401 → redirect `/login`
- [x] FE3 · `Login` page: email/username + password + demo persona select (2 doctors only) — sign-in only, no auto-signup, no admin demo
- [x] FE4 · `Dashboard`: DayView (today's appointments + `public` badge), StatsPills (patients/active plans/unpaid), patient search table, 60s polling
- [x] FE5 · `ToothChart` component: 32-tooth FDI grid (two rows of 8), colour legend, click → history panel + status/treatment actions, aria-labels per tooth
- [x] FE6 · `PatientDetail` page: chart + treatment plan timeline + invoice card (mark paid/partial)
- [x] FE7 · `PublicBooking` page (`/book`, no auth): 4 steps — dentist → date (14d) → slot grid → name/phone/reason + friendly 409 re-pick
- [x] FE8 · `ChatDrawer`: bubbles, per-day chips, send → POST chat, optional TTS playback button
- [x] FE9 · Build passes (`npm run build`), reduced-motion + focus-visible, Manrope font

## BACKEND track (server/) ❌
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

## DATABASE track ❌
- [x] DB1 · `schema.sql` — 15 tables: users, dentists, patients, dentist_patients, appointments, dentist_schedules, treatments, tooth_records, treatment_plans, plan_items, invoices, ai_doctor, assistant_audit, conversations, conversation_messages
- [x] DB2 · CHECK constraints: roles, appointment status (incl. `no_show`), tooth_status 7 values, invoice status, plan/item status
- [x] DB3 · Indexes: (dentist_id, appointment_date), tooth_records(patient_id), invoices(status), UNIQUE dentist_patients, UNIQUE conversations(user_id,day)
- [x] DB4 · FDI rule enforced in service layer (`validTooth`: adult 11–48, primary 55–85) before any tooth_records write
- [x] DB5 · Additive-migration policy documented + version bump ritual (schema change ⇒ bump VERSION + package.json)
- [x] DB6 · Scratch-DB test isolation (DB_FILE env → temp file, never real dental.db)

## Phase 7 — Tests + deploy ❌
- [x] `test/dental.test.js` supertest+node:test: 16 checks (isolation, FDI, slot clash, booking limits, 401/404, chart scope, invoice status) — ALL GREEN
- [ ] `render.yaml` (API service + static site) or single service serving `client/dist`; live smoke

## Known gaps (deliberate v1 deferrals)
- Patient portal/login, payments gateway, X-ray uploads, child-teeth full grid — see [Prd.md §6](Prd.md)

## v1.2.2 track (2026-10-21) — UX polish only, no new features — all ✅
- [x] FE · Login: password visibility toggle (Eye/EyeOff), 44px header tap targets, comfortable phone-sized inputs
- [x] FE · Dashboard borders: visible outlines on panels/ref-cards, accent spines on stat cards, header rules, crisper separators
- [x] FE · Dashboard phone pass (≤600px): two-up stats, 44px tap targets, icon-only secondary links, stacking booking form, wrapping rows
- [x] FE · Full-project phone pass (390px audit, every route): admin tables scroll inside their card (overflow-x fix — they were clipped), admin KPI/glance grids go 2×2, smaller table type, booking form yes/no cells get 44px tap targets + bigger radios, footer nav links get 44px targets, booking CTA full width. Verified: 0 sideways overflow on landing / login / dashboard / admin / patient detail / booking / section pages / 404; tooth chart wraps cleanly; Era chat drawer fits (374px, no clipping); testimonial marquee is clipped by design
- [x] OPS · render.yaml: NVIDIA_API_KEY as a `sync: false` secret (Render prompts, key never enters git) — enables hosted Sofia voice on the deployment
- [x] DOC · version bump 1.2.2 (UI behaviour change)
