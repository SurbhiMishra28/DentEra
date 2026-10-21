# DentEra — Architecture

**Version:** 1.3.0 · **Date:** 2026-10-21
Sibling of Era's [../Architecture.md](../Architecture.md) — same discipline (scoped tools, audit, additive
migrations), **React + Express stack** (revised per user decision).

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Client | **React 18 + Vite + hash routing** (`client/`, plain CSS, mint theme) | component UI for chart/dashboard; fast dev server |
| Server | **Express 4** (Node ≥20), CommonJS (`server/`) | routers per resource, battle-tested middleware model |
| Database | **better-sqlite3**, one file `server/db/dental.db` (+ daily backups) | synchronous + fast, prepared statements, no ORM |
| Auth | bcryptjs + jsonwebtoken + cookie-parser | JWT 8h in an HttpOnly cookie (+ Bearer for curl); portal = phone+dob JWT |
| AI | intent-ladder brain + 15-row dental KB + Sofia TTS proxy | deterministic, no LLM cost |
| Realtime | in-app `notifications` + SSE hub (`/api/stream`), polling fallback | no websocket dependency |
| Testing | node:test + supertest (server, **37 checks**) + `test/browsertest.js` browser E2E | HTTP-layer + real-UI verification |
| Deploy | Render: single service — Express serves the built `client/dist` (see `render.yaml`) | free tier |

**Rule that survives every stack change:** Era's code is never imported — logic is copied into
`server/services/`; security rules (JWT-only identity, ownership-in-WHERE, parameterized queries,
audit) are identical.

## 2. Folder layout (actual, v1.3.0)

```
dentera/                                  ← self-contained sub-project (never imports Era's ../lib or ../db)
├─ Prd.md · Architecture.md · Design.md · Rules.md · Task.md · Memory.md · implementation.md
│  Features.md · Flows.md · README.md · render.yaml
├─ docs/                                  ← generated guides: Features-and-Flows(.md/-Simple.md)
│                                            Backend-Flow.md · Full-Flow.md
├─ package.json                           scripts: dev(start) / test / build — v1.3.0
├─ .env / .env.example                    PORT, JWT_SECRET, NVIDIA_API_KEY, CORS_ORIGIN, DB_FILE,
│                                         DEMO_LOGIN, REMINDER_WEBHOOK_URL
├─ server/                                Express API
│  ├─ index.js                            entry: env → middleware → routes → SPA static → listen :8100
│  │                                        + reminder tick (5 min) + daily backup schedule
│  ├─ db/
│  │  ├─ schema.sql                       26 tables (single source of truth, idempotent CREATE IF NOT EXISTS)
│  │  ├─ connection.js                    better-sqlite3 open + PRAGMA foreign_keys + demo seed +
│  │  │                                   appointment re-dating ritual
│  │  └─ backups/                         daily snapshots (newest 7 kept)
│  ├─ middleware/
│  │  ├─ auth.js                          bcrypt + JWT 8h + requireAuth/requireRole/requireDentist
│  │  ├─ rateLimit.js                     global per-IP limiter (GET 600/min, writes 300/min backstop)
│  │  ├─ csrf.js                          cookie-session origin guard for state changes
│  │  └─ helpers.js                       shared route plumbing (h() wrapper, error shaping)
│  ├─ routes/                             one router per concern, mounted in order of publicness:
│  │  auth · publicBooking · portal · assistant · admin · clinical · money · insights · staff · resources
│  └─ services/
│     ├─ tools.js                         dental tools — scopeDentist bodyguard; clinic-table SQL owner
│     ├─ brain.js                         intent ladder (writes before reads) + briefing/slot-move/recall
│     ├─ money.js                         payments/expenses/inventory + P&L
│     ├─ clinical.js                      documents/prescriptions/perio
│     ├─ analytics.js                     trend/top treatments/utilisation/no-show/recall
│     ├─ reminders.js                     generate/runDue + console|webhook providers
│     ├─ backup.js                        daily db.backup() snapshots (newest 7)
│     ├─ notify.js                        in-app notifications + SSE hub
│     ├─ audit.js                         assistant_audit writer
│     ├─ tts.js                           Sofia proxy (HTTP×3 → gRPC×2, LRU 20) — optional
│     ├─ fdi.js                           validTooth() FDI validator
│     └─ knowledge.js                     15 dental Q&A rows + safety line
├─ client/                                Vite React app
│  ├─ index.html · vite.config.mjs        (dev proxy /api → :8100; hashed build)
│  └─ src/
│     ├─ main.jsx · App.jsx               hash routes: / #/dashboard #/admin #/patients/:id #/book
│     │                                   #/portal /about /services /why-choose /gallery /blog
│     ├─ api.js                           fetch wrapper (credentials: 'include', JSON error shape, 401 redirect)
│     ├─ theme.js · dark.css              system-following dark mode + manual toggle
│     ├─ pages/                           Landing · LandingSection · Login · Dashboard · PatientDetail ·
│     │                                   PublicBooking · Portal · Admin ·NotFound (+ pages/portal.css)
│     ├─ components/                      Icons · Notifications · ThemeToggle · TrendChart · EraStage ·
│     │                                   ErrorBoundary · DentEraMark …
│     ├─ dashboard.css · dashboard-v13.css mint theme v13 tokens (Design.md)
│     └─ utils/                           printRx.js · receipt.js (print-window PDFs)
├─ server/uploads/                        clinical files OUTSIDE the web root (streamed, never static)
└─ test/
   ├─ dental.test.js                      supertest suite (scratch DB via DB_FILE) — 37 checks
   └─ browsertest.js                      browser E2E (headless Chrome): landing→portal flows
```

## 3. Database — 26 tables in `server/db/schema.sql`

Clinic core (13) + chat (2) + v1.3 additions (11), all `CREATE TABLE IF NOT EXISTS` (additive-only;
the single guarded rebuild was the `users` role CHECK in v1.3).

| Table | Purpose / key columns |
|---|---|
| `users` | login accounts — role CHECK `dentist/admin/reception/patient`; `patient_id` set only for portal accounts |
| `dentists` | profile — user_id UNIQUE FK, specialty, room_no |
| `patients` | name, dob, phone, gender, medical_notes (allergies!) |
| `dentist_patients` | isolation join — UNIQUE(dentist_id, patient_id) |
| `appointments` | dentist_id, patient_id?, patient_name, date, start/end, status `scheduled/completed/cancelled/no_show`, reason, email, address, **source `doctor/public`** |
| `dentist_schedules` | working hours per weekday (0–6, start, end) |
| `treatments` | catalogue — name, default_cost, default_minutes, category (8 values) |
| `tooth_records` | **the chart** — patient_id, dentist_id, tooth_fdi (validated), tooth_status (7 values), condition, treatment_id?, visit_date, cost, notes |
| `treatment_plans` | patient_id, dentist_id, title, status `draft/active/completed/cancelled`, total_estimate |
| `plan_items` | plan_id, tooth_fdi, treatment_id, visit_no, cost, status `planned/done/cancelled` |
| `invoices` | patient_id, plan_id?, amount, discount, paid_amount, status `unpaid/partial/paid`, issued_at |
| `ai_doctor` | dental Q&A — q, keywords JSON, a |
| `assistant_audit` | every tool call / booking attempt / state change (with `request_id`) |
| `conversations` · `conversation_messages` | chat drawer — UNIQUE(user_id, day); messages FK cascade delete |
| `payments` | one row per payment: invoice_id, patient_id, amount, method `cash/upi/card/bank/other`, reference, received_by |
| `expenses` | category (8 values), description, amount, spent_at, created_by |
| `inventory_items` · `inventory_moves` | name/unit/stock_qty/min_qty/unit_cost; every ±stock move with reason |
| `documents` | clinical files: patient_id, tooth_fdi?, kind `xray/photo/report/consent/prescription/other`, stored_name (uploads dir) |
| `prescriptions` · `prescription_items` | header (diagnosis, advice) + medicine lines (dose/frequency/days) |
| `perio_records` · `perio_measurements` | 6 sites per tooth: site 1–6, pocket_depth, bleeding, recession |
| `reminders` | appointment_id?, channel `sms/email/whatsapp`, kind, message, send_at, status `pending/sent/failed/skipped`, provider |
| `notifications` | audience `staff/dentist/patient`, kind, title, body, link, read_at — feeds the bell + SSE |

Safety: `PRAGMA foreign_keys = ON`, parameterized `?` queries everywhere, indexes on
`(dentist_id, appointment_date)`, `tooth_records(patient_id)`, `invoices(status)`,
`payments(invoice_id)`, `reminders(status, send_at)`, `notifications(audience, read_at)`.

## 4. Reactive (mount order matters)

```js
const limiter = require('./middleware/rateLimit'); app.use(limiter);
app.use(require('./middleware/csrf').csrfGuard);   // cookie-session CSRF inside limiter path
app.use(bodyParser(with 100KB cap));               // 8 MB for /api/documents (base64 uploads)
```
Middleware chain: request-id + error shaping (helpers), rate limiter, CSRF, parsers. The client
`api.js` wrapper keeps `credentials:'include'` so the cookie rides along and CSRF same-origin passes.

## 5. API map (router.mounted before `/api/*` 404)

| Method+Path | Auth | Does |
|---|---|---|
| `POST /api/auth/login` · `/logout` · `GET /api/auth/me` | see left | sign-in (doctors + admin; username `admin` supported) · clear cookie · identity |
| `POST /api/auth/change-password` | ✓ | self-service password update |
| `POST /api/auth/demo-login` | DEMO_LOGIN | persona select (`dentistA/dentistB` only — admin is never a demo persona) |
| `GET /api/public/slots?dentist=&date=` | 🔓 | free slots for the booking page |
| `POST /api/public/booking` · `POST /api/public/track` | 🔓 (rate-limited 5/10min/IP) | guest books a future slot — validates name/phone/date/time, `slotClash`, `source='public'` · look up a booking |
| `GET/POST /api/appointments`, `GET/PATCH/DELETE /api/appointments/:id`, `GET /api/slots` | dentist | CRUD, ownership in WHERE, overlap-checked |
| `GET /api/patients`, `GET /api/patients/:id` | dentist | scoped register (auto duplicates) |
| `GET/POST /api/chart/:patientId`, `GET/POST …/perio` | dentist | tooth_records + periodontal read/write (FDI validated) |
| `GET/POST /api/plans`, `PATCH /api/plans/:id/items/:itemId`, `GET /api/treatments` | dentist | plans + item status; catalogue read |
| `GET /api/invoices`, `PATCH /api/invoices/:id`, `GET/POST /api/invoices/:id/payments`, `GET …/statement`, `GET …/upi` | dentist/reception | billing, mark paid, ledger, statement, UPI link |
| `GET/POST /api/expenses`, `GET /api/finance/pnl` | dentist/admin | money out + cash-basis P&L |
| `GET/POST /api/inventory`, `POST /api/inventory/:id/move`, `GET …/moves` | dentist/admin | stock levels + movements + low-stock alerts |
| `POST /api/documents`, `GET /patients/:id/documents`, `GET /documents/:id/file`, `DELETE …` | dentist | upload/stream/remove clinical files (uploads dir, never web root) |
| `POST /api/prescriptions`, `GET /patients/:id/prescriptions`, `GET /prescriptions/:id` | dentist | printable prescriptions |
| `GET/POST /api/chart/:patientId/perio` | dentist | periodontal charting |
| `GET /api/analytics/summary|trend|top-treatments|utilisation`, `GET /api/recall` | dentist/admin | practice insights + recall list |
| `GET /api/notifications`, `POST /api/notifications/read`, `GET /api/stream` | dentist/staff | bell data + read marks + SSE push |
| `POST /api/assistant/chat`, `GET/DELETE /api/assistant/conversations…`, `POST /api/assistant/tts` | dentist | brain → tool → sanitized reply (audit) · chat history · speech |
| `POST /api/portal/*` · `GET /api/portal/*` | 👤 patient JWT (phone+dob) | scoped visits, bills, chart, files, booking, cancel, pay, notifications |
| `GET /api/admin/*` (overview, appointments, patients, audit, dentists, staff, analytics, recall, reminders, backups, inventory, finance) | admin (+reception where allowed) | clinic-wide console + writes (dentists/staff, reminders, backups) |
| `GET /api/health` | 🔓 | `{ok, db:'sqlite', version, counts}` |

Order matters: public + portal + assistant + admin routers are mounted before `resources` because
`resources.js` carries a router-level `requireAuth` guard.

## 6. AI pipeline (deterministic, v1.3)

```
🎙️/⌨️ ──▶ /api/assistant/chat ──▶ requireAuth ──▶ routeIntent ladder (writes before reads):
   cancel/reschedule → markInvoicePaid → createPlan → updateToothRecord → move-to-next-free-slot
   → next appointment → patient chart → day view → slots → patients → plans → invoices
   → treatments → dental Q&A (15 KB rows) → greeting/help  (+ morning briefing)
 ──▶ runTool (scopeDentist) ──▶ sanitize ──▶ toolReply (human sentence) ──▶ audit
 reply ──▶ /api/assistant/tts ──▶ Sofia (EN-US/HI-IN) ──▶ WAV (or browser/OS voice fallback)
```

## 7. Request flow (any feature, end to end)

```
React (api.js, credentials:'include') ──▶ rateLimit → csrfGuard → parser ──▶ Express route
   ──▶ auth middleware ──▶ services/*.js (the only SQL) ──▶ dental.db ──▶ audit() ──▶ JSON reply
                                          └─▶ notify.js → notifications row → SSE `/api/stream`
```

Ports: dental API on **8100**; Vite dev server :5173 proxies `/api` → 8100. Production: Express serves
`client/dist` as static — one process, one port. Background jobs: reminder loop (5 min), daily backup.
