# DentEra — Features list with implementation

**Version:** 1.3.1 · **Date:** 2026-10-21
Companion docs: [Prd.md](Prd.md) (why) · [Flows.md](Flows.md) (step-by-step behaviour) · [Task.md](Task.md) (when).
Status marks: ❌ not built · 🔶 partial · ✅ done. **v1.3.0 is SHIPPED — everything below is ✅:**
37/37 server tests green, production build passes, browser E2E green with zero console errors.
**Stack note (v1.3.0):** server = Express + better-sqlite3, client = React (Vite) — "Era pattern" below
means copy the LOGIC, not the framework. v1.1.0 → v1.3.0 added the patient portal, payments,
clinical records, reminders, analytics, static features and the security backstops listed under F16.

## Quick map — feature → phase → core files

| ID | Feature | Phase | Tables | Primary endpoints | UI home |
|---|---|---|---|---|---|
| F1 | Auth & roles | 2 | users, dentists | `/api/auth/*`, `/api/assistant/me` | login card |
| F2 | Practice dashboard | 2 | (reads others) | appointments, invoices (read) | dashboard |
| F3 | Patient register | 2 | patients, dentist_patients | `/api/patients` | dashboard |
| F4 | Appointments | 2 | appointments, dentist_schedules | `/api/appointments` CRUD | dashboard day view |
| F5 | Dental chart (FDI) | 3 | tooth_records | `/api/chart/:patientId` | chart widget |
| F6 | Treatments catalogue | 4 | treatments | `/api/treatments` | chart side panel |
| F7 | Treatment plans | 4 | treatment_plans, plan_items | `/api/plans`, `PATCH items` | patient detail |
| F8 | Billing / invoices | 4 | invoices | `/api/invoices`, `PATCH :id` | stats + patient detail |
| F9 | Public booking | 5 | appointments (`source='public'`) | `/api/public/slots`, `/api/public/booking` | PublicBooking page (`/book`) |
| F10 | AI brain (13 tools) | 6 | (reads/writes others) | `/api/assistant/chat` | chat drawer |
| F11 | Sofia voice (TTS) | 6 | — | `/api/tts`, `/api/tts/voices` | settings + drawer |
| F12 | Chat panel + history | 6 | conversations, conversation_messages | `/api/assistant/conversations` | chat drawer |
| F13 | Audit trail | 2–6 | assistant_audit | (server-side only) | — |
| F14 | Health & ops | 1 | — | `/api/health` | — |
| F15 | Chat history store | 6 | conversations, conversation_messages | `/api/assistant/conversations` | chat drawer |

---

## F1 — Authentication & roles ✅
**What:** dentist/reception sign in; unknown email auto-creates a dentist account; demo personas behind `DEMO_LOGIN`.
**Implementation:** bcryptjs hashing, HS256 JWT 8h in HttpOnly `dent_token` cookie (+ Bearer for curl). Roles `dentist|admin|reception`; `requireDentist` for chart/plan writes. Login throttle: 8 tries/15 min per (IP+email), 30/IP (Era's two-counter lesson).
**Era pattern:** copy the LOGIC of Era's `lib/auth.js` + login route into `server/middleware/auth.js` + `server/routes/auth.js` (same shape, new stack).

## F2 — Practice dashboard ✅
**What:** one glance = today's appointments (with `public` badge), 3 stat pills (today's patients · active plans · unpaid invoices), patient search.
**Implementation:** 3 parallel GETs on login: `appointments?upcoming=1&limit=20`, `patients?limit=50`, `invoices?status=unpaid`. Pills computed client-side. Poll every 60 s while tab visible.
**Era pattern:** day-view rows of Era's `getMyAppointments` reply, but as list UI instead of speech.

## F3 — Patient register ✅
**What:** add/edit patient (name, dob, phone, gender, **medical_notes** — allergies shown with ⚠️).
**Implementation:** `patients` + `dentist_patients` isolation join; `GET /api/patients?q=` searches `LIKE` on name/phone (parameterized); `POST` auto-links creator dentist. Phone UNIQUE-ish: duplicate phone returns existing patient id with `200 existing:true` (walk-in safety).
**Era pattern:** `scopeDoctor` → here `scopeDentist` bodyguard at top of `tools.js`.

## F4 — Appointments (CRUD) ✅
**What:** book/move/cancel visits; clash detection by **interval overlap**, not start equality.
**Implementation:** `appointments` (status `scheduled/completed/cancelled/no_show`); `slotClash(dentistId,date,start,end)` = overlap math against same-day non-cancelled rows; `PATCH` for move/status; `no_show` is dental-specific (extra vs Era).
**Era pattern:** Era's `tools.js` `slotClash` + `createAppointment` (bug N2 pre-fixed here).

## F5 — Dental chart (FDI) ✅ — *the hero feature*
**What:** 32-tooth interactive grid; per-tooth status colour + full treatment history.
**Implementation:** `tooth_records(patient_id, dentist_id, tooth_fdi, tooth_status CHECK 7 values, condition, treatment_id?, visit_date, cost, notes)`. `GET /api/chart/:patientId` returns records grouped by tooth + patient summary; `POST` appends a history row (validated by `validTooth()`: adult `11–48`, primary `55–85`). UI: two rows of 8 `<button>` teeth, colour legend, per-tooth side panel. Write requires dentist role.
**Era pattern:** none (new) — but write path follows the same scope + validate + audit rules.

## F6 — Treatments catalogue ✅
**What:** 12 standard treatments with default cost/minutes/category (seeded).
**Implementation:** `treatments` table, read-only API; plan items and tooth records reference `treatment_id`; dentist may override cost at record time (original default preserved).

## F7 — Treatment plans ✅
**What:** multi-visit plan ("Full mouth rehab": Scaling → RCT 36 → Crown 36) with per-item status.
**Implementation:** `treatment_plans` (status `draft/active/completed/cancelled`, total_estimate) + `plan_items` (visit_no, tooth_fdi, treatment_id, cost, status `planned/done/cancelled`). `POST /api/plans` inserts plan+items in **one transaction**; `PATCH /api/plans/:id/items/:itemId` flips item status and recomputes totals. Voice: `createTreatmentPlan` tool accepts items[] in one sentence ("create a plan for Sara: scaling, RCT on 36, crown on 36").

## F8 — Billing / invoices ✅
**What:** invoice per plan/visit; mark paid (full/partial); unpaid list on dashboard.
**Implementation:** `invoices(patient_id, plan_id?, amount, discount, paid_amount, status CHECK unpaid/partial/paid, issued_at)`. `PATCH /api/invoices/:id {paid_amount}` recomputes status (`paid_amount>=amount→paid`, `>0→partial`); reception role allowed on invoices only. All money = integer rupees (no floats).

## F9 — Public booking ✅ — *the only unauthenticated write*
**What:** guest books a real slot without an account.
**Implementation:** `GET /api/public/slots?dentist=&date=` (rate-limited read) + `POST /api/public/booking` — 5 attempts/10 min/IP, validates name ≤120, phone `^[0-9+\-\s]{7,15}$`, date within next 14 days, HH:MM, then `slotClash` → inserts `appointments` with `source='public'`, `patient_id=NULL`, `patient_name+reason` from body. 409 speaks "that slot was just taken". Reception sees these with a badge.
**Era pattern:** Era's demo-login throttle map → reused for the booking limiter.

## F10 — AI brain (13 tools) ✅
**What:** deterministic intent ladder; answers come ONLY from scoped data or the 15-row dental KB (+safety line).
**Implementation:** ladder order = `reschedule → cancel → markInvoicePaid → createPlan → updateToothRecord → next appointment → patient chart → day view → slots → patients → plans → invoices → treatments → dental Q&A → greeting → help` (writes before reads — Era bug N1 pre-fixed). `routeIntent(message, user)` returns `{tool,args}` or `{text}`; date/time parsing via Era's `pickDateTime` (12h/24h, aaj/kal).

## F11 — Sofia voice ✅
**What:** every reply speaks in NVIDIA Sofia (EN-US default, HI-IN auto for हिन्दी/Hinglish).
**Implementation:** `server/services/tts.js` carries the hosted pipeline logic (HTTP×3 → gRPC×2, LRU cache 20, RIFF validation) behind `POST /api/assistant/tts`; when the hosted service is unavailable the browser/OS female voice is the fallback and text assistance always works.

## F12 — Chat panel + per-day history ✅
**What:** doctor↔Era Dental conversation visible in a drawer; past days as tag chips; delete a day.
**Implementation:** `conversations` (UNIQUE user_id+day) + `conversation_messages` (role user/era, tool); `logChatTurn` best-effort on every spoken/typed exchange; endpoints `GET /api/assistant/conversations`, `GET …/:id`, `DELETE …/:id` — ownership by `user_id`, cross-user = 404. Same drawer UX as Era v4.5.

## F13 — Audit trail ✅
**What:** who did what, when, with which request id.
**Implementation:** `audit()` on login (pass/fail/throttle), every tool call, every public booking attempt, every 500. Shape identical to Era's `assistant_audit`.

## F14 — Health & static serving ✅
**What:** `/api/health` → `{ok, db:'sqlite', version}` for uptime checks; no-cache static; `?v=` asset busting; own `render.yaml` in Phase 7.

---

# v1.3.0 — added features (all ✅ built, all tested)

Stack unchanged: Express + better-sqlite3 + React (Vite). Additive-only migrations (new tables
`payments`, `expenses`, `inventory_items`, `inventory_moves`, `documents`, `prescriptions`,
`prescription_items`, `perio_records`, `perio_measurements`, `reminders`, `notifications`).
`users` gained the `reception` (staff) + `patient` (portal) roles and a `patient_id` link
(one guarded table rebuild — ids, hashes and chat history preserved).

| ID | Feature | Key tables | Endpoints | UI home |
|---|---|---|---|---|
| F16 | Patient portal | users(`patient`) | `/api/portal/*` | Portal page (`#/portal`) |
| F17 | Payments + history | payments | `/api/invoices/:id/payments`, `…/statement`, `…/upi` | Dashboard → Billing |
| F18 | Expenses & profit/loss | expenses | `/api/expenses`, `/api/finance/pnl` | Admin → Expenses |
| F19 | Inventory + low-stock alerts | inventory_items, inventory_moves | `/api/inventory*` | Admin → Inventory |
| F20 | Documents (X-rays, reports) | documents | `/api/documents`, `/api/patients/:id/documents` | PatientDetail → Files |
| F21 | Prescriptions (printable) | prescriptions, prescription_items | `/api/prescriptions*` | PatientDetail → Prescriptions |
| F22 | Periodontal charting | perio_records, perio_measurements | `/api/chart/:patientId/perio` | PatientDetail → Periodontal |
| F23 | Reminders (pluggable provider) | reminders | `/api/admin/reminders*` | Admin → Reminders |
| F24 | Analytics + recall list | (reads others) | `/api/analytics/*`, `/api/recall` | Dashboard → Insights / Recall |
| F25 | Week view (drag to move) | (reads appointments) | `/api/appointments?from&to` | Dashboard → Week view |
| F26 | Reception staff accounts | users(`reception`) | `/api/admin/staff*` | Admin → Staff |
| F27 | Live notifications (SSE) | notifications | `/api/stream`, `/api/notifications` | bell in every toolbar |
| F28 | Dark mode | — | — | toggle in every toolbar |
| F29 | Security backstops | — | global rate limiter + CSRF guard | — |
| F30 | Daily database backups | — | `/api/admin/backups*` | Admin → Backups |

## F16 — Patient portal ✅
Sign-in by **phone + date of birth** (no password): the portal JWT carries `patientId`, every query
is scoped to it, and a dentist token on `/api/portal/me` is a 403. Patients see their visits
(book + cancel), invoices (pay with method + reference), tooth records, plans and shared files.
A booking made in the portal is `source='public'` and still passes the interval-overlap check.

## F17 — Payments ✅
`recordPayment` appends a `payments` row and recomputes the invoice from the **sum of payments**
(overpayment refused, ≥ due amount → paid). History per invoice, a printable statement
(invoice + patient + plan items + payment list), and a **UPI deep link** per outstanding invoice
(copy or open in any UPI app; the payment is still recorded by hand once the money lands).

## F18 — Expenses & profit/loss ✅
`expenses` (rent/salary/lab/material/utility/marketing/equipment/other) logged by staff; `/api/finance/pnl`
compares money in (payments in window) with money out and shows the split by method and category.

## F19 — Inventory ✅
Consumables with `stock_qty` / `min_qty` / `unit_cost`; ±1 (or bulk restock) writes an `inventory_moves`
row with a reason. Crossing the minimum raises a **low-stock notification** (bell + SSE) and a
restock shortcut on the Admin panel. Full movement history per item.

## F20 — Documents ✅
Base64 upload (JPG/PNG/WEBP/GIF/PDF, ≤ 6 MB) stored **outside the web root** in `server/uploads/`
and streamed through an authenticated route — no public static path. Ownership enforced
(another dentist gets 404, never a byte). Optional per-tooth tagging; view + delete in the UI.

## F21 — Prescriptions ✅
Diagnosis + advice + medicine lines (dose / frequency / days), printed through the same
print-window pattern as receipts (`utils/printRx.js`) — the browser dialog can "Save as PDF".
History per patient with a one-click reprint.

## F22 — Periodontal charting ✅
Six sites per tooth (pocket depth 0–15 mm, bleeding on/off, recession) in one POST; the summary
returns max/average depth, bleeding count and a mild/moderate/severe verdict per tooth — the data
a perio re-evaluation actually needs.

## F23 — Reminders ✅
`generate()` plans one 24h reminder per visit in the next 24 h (public bookings get an instant
confirmation from the booking route), `runDue()` sends what is due through a **provider**:
`console` (logs, honest default) or `webhook` (`REMINDER_WEBHOOK_URL` → your own SMS/email/WhatsApp
relay). The front desk can queue custom reminders and skip/re-open any row. Run by a 5-minute loop
plus an on-demand button, and each send raises a staff notification.

## F24 — Analytics + recall ✅
`/api/analytics/*` (own practice for a dentist, clinic-wide for admin): daily revenue + appointment
trend, top treatments, chair utilisation, no-show rate, and the **recall list** (no completed visit
in 6 months, or never seen). Rendered as inline SVG — still no chart library.

## F25 — Week view ✅
Seven columns from `/api/appointments?from&to`; a visit card can be dragged to another day, which
PATCHes the appointment (the server re-checks overlaps, so a clash is refused with a message).

## F26 — Reception staff accounts ✅
Admin creates `reception` logins: the front desk may run appointments, public bookings, invoices and
receipts, but charts and treatment plans stay dentist-only (403). Only `admin` may add/remove staff.

## F27 — Live notifications ✅
`notifications` + an SSE hub at `/api/stream` (EventSource rides the cookie): public bookings,
payments, low stock, backups and reminders appear in the bell instantly, with a 60 s polling
fallback and per-item or mark-all read.

## F28 — Dark mode ✅
`data-theme="dark"` on `<html>` with token overrides (`dark.css`) and a follow-system default;
the choice persists in `localStorage`. The toggle lives in every toolbar.

## F29 — Security backstops ✅
- Global per-IP limiter (GET 600/min, writes 300/min) as a **backstop** — sign-in (8/15 min) and
  public booking (5/10 min) keep their own stricter counters.
- CSRF guard: a state-changing request carrying the session cookie must come from our own origin.
- Audit rows on payments, expenses, inventory moves, prescriptions, perio, reminders, staff
  changes and backups — all with `request_id`.

## F30 — Daily backups ✅
`db.backup()` snapshot every 24 h (plus on demand), newest seven kept, each one announced in the bell.
**Not a substitute for Postgres**: Render's free disk is ephemeral, so treat the demo store as disposable
and move to a managed database for real clinic use (see README → "Data durability").

---

## Static features (implementation)

The "static" surface = everything a visitor gets from the built app without any clinic interaction,
plus how static assets are delivered. All served from `client/dist`.

| ID | Static feature | Where | How it works |
|---|---|---|---|
| S1 | Page shell + hash router | `client/index.html`, `client/src/main.jsx`, `client/src/App.jsx` | single-page shell; `#/`-routes incl. `/about`, `/services`, `/why-choose`, `/gallery`, `/blog` |
| S2 | Landing page (guest home) | `client/src/pages/Landing.jsx` | rendered when no session at `#/` — hero, services preview, clinic info |
| S3 | Section pages | `client/src/pages/LandingSection.jsx` | one component rendered per section path |
| S4 | Public booking funnel | `client/src/pages/PublicBooking.jsx` | 4 steps (dentist → date → slot → name/phone/reason), no account needed |
| S5 | Mint theme + dark mode styles | `client/src/dashboard.css`, `dashboard-v13.css`, `dark.css`, `portal.css` | CSS custom-property tokens (Design.md); dark via `data-theme="dark"` overrides |
| S6 | Theme behaviour | `client/src/theme.js` | follows system by default, persisted manual toggle |
| S7 | Inline icon set | `client/src/components/Icons.jsx` | hand-rolled SVG components — no icon dependency |
| S8 | Charts | `client/src/components/TrendChart.jsx` | inline SVG trend rendering — no chart library |
| S9 | Print utilities | `client/src/utils/printRx.js`, `client/src/utils/receipt.js` | print-window for prescriptions, statements and receipts ("Save as PDF") |
| S10 | Static delivery | `server/index.js` | `express.static(client/dist)`, `Cache-Control: no-cache` on `.html`, SPA fallback for client routes, uniform JSON 404 for unknown `/api` paths |
| S11 | Build tooling | `vite.config.mjs` | hashed production build; dev proxy `/api` → :8100 |
| S12 | Job/notice widgets | `client/src/components/Notifications.jsx`, `ThemeToggle.jsx`, `TrendChart.jsx` | static components mounted by dashboards after auth |

Rules honoured (`Rules.md`): no UI kit, no CSS framework (hand-rolled mint theme), fewer than 10 runtime
dependencies; uploads are never exposed through the static path (F20); tooth grid buttons carry
`aria-label` for accessibility.

## CRUD operations (endpoint reference)

Key: 🔓 public · 🦷 dentist (JWT) · 🖥 admin/reception or dentist · 👤 patient portal session.
Ownership always in the WHERE clause; another dentist's row is a **404** (never a 403 that confirms
existence), and every mutation lands in `assistant_audit` with a `request_id`.

| Resource | Read | Create | Update | Delete |
|---|---|---|---|---|
| Sessions | 🦷 `GET /api/auth/me` | 🔓 `POST /api/auth/login`, `POST /api/auth/demo-login`, 👤 portal sign-in | 🦷 `POST /api/auth/change-password` | 🔓 `POST /api/auth/logout` |
| Patients | 🦷 `GET /api/patients?q=`, 🖥 `GET /api/admin/patients`, 👤 `GET /api/portal/me` | 🦷 `POST /api/patients` (auto-linked to creator; duplicate phone returns the existing row) | — (clinical history is append-only) | — (audit record preserved) |
| Appointments | 🦷 `GET /api/appointments[?from&to]`, 🔓 `GET /api/public/slots` | 🦷 `POST /api/appointments` · 🔓 `POST /api/public/booking` (5/10 min/IP) · 👤 `POST /api/portal/appointments` | 🦷 `PATCH /api/appointments/:id` (move/status) | 🦷 `DELETE /api/appointments/:id` (soft cancel preferred) |
| Tooth records | 🦷 `GET /api/chart/:patientId`, 👤 `GET /api/portal/chart` | 🦷 `POST /api/chart/:patientId` (`validTooth` + ownership check) | — (appends history rows; log is immutable) | — |
| Perio charting | 🦷 `GET /api/chart/:patientId/perio` | 🦷 `POST /api/chart/:patientId/perio` | — | — |
| Treatments | 🦷 `GET /api/treatments` | seeded | seeded | seeded |
| Plans / items | 🦷 `GET /api/plans`, `GET /api/plans/:id`, 👤 `GET /api/portal/plans` | 🦷 `POST /api/plans` (plan+items in one transaction) | 🦷 `PATCH /api/plans/:planId/items/:itemId` (status recompute) | — |
| Invoices | 🦷 `GET /api/invoices?status=`, 🖥 `GET /api/admin/invoices/:id`, 👤 `GET /api/portal/invoices` | auto-issued on first done plan item | 🦷 `PATCH /api/invoices/:id` (paid_amount → partial/paid recompute) | — |
| Payments | 🦷 `GET /api/invoices/:id/payments`, `…/statement`, `…/upi` | 🦷 `POST /api/invoices/:id/payments` · 👤 `POST /api/portal/invoices/:id/payments` | — | — |
| Expenses | 🖥 `GET /api/expenses`, `GET /api/finance/pnl` | 🖥 `POST /api/expenses` | — | — |
| Inventory | 🖥 `GET /api/inventory`, `GET /api/inventory/:id/moves` | 🖥 `POST /api/inventory` | 🖥 `POST /api/inventory/:id/move` (±stock + reason) | — |
| Documents | 🦷 `GET /api/patients/:id/documents`, 🔒 `GET /api/documents/:id/file` | 🦷 `POST /api/documents` (base64, MIME-whitelisted, ≤6 MB) | — | 🦷 `DELETE /api/documents/:id` |
| Prescriptions | 🦷 `GET /api/patients/:id/prescriptions`, `GET /api/prescriptions/:id` | 🦷 `POST /api/prescriptions` | — | — |
| Reminders | 🖥 `GET /api/admin/reminders` | 🖥 `POST /api/admin/reminders`, `POST /api/admin/reminders/run` | 🖥 `PATCH /api/admin/reminders/:id` (skip/re-open/custom) | — |
| Notifications | 🦷 `GET /api/notifications`, 👤 `GET /api/portal/notifications`, `GET /api/stream` (SSE) | server-generated (bookings, payments, low stock, backups, reminders) | 🦷 `POST /api/notifications/read` · 👤 `POST /api/portal/notifications/read` | — |
| Dentists / staff | 🖥 `GET /api/admin/dentists`, `GET /api/admin/staff` | 🖥 `POST /api/admin/dentists`, `POST /api/admin/staff` | 🔒 password change | 🖥 `DELETE /api/admin/staff/:id` |
| Conversations | 🦷 `GET /api/assistant/conversations`, `GET …/:id` | auto-persisted per chat turn | — | 🦷 `DELETE /api/assistant/conversations/:id` |
| Backups | 🖥 `GET /api/admin/backups` | 🖥 `POST /api/admin/backups` | — | rotation keeps newest 7 |

**Delete policy:** medical history is immutable — charts, plans, invoices and payments are never
hard-deleted. The few true deletions: appointments (junk rows; soft status change is preferred),
documents, a day of chat history, and staff accounts (audit trail survives).

**Public (unauthenticated) surface — the complete list:** `GET /api/health`, `POST /api/auth/login`,
`GET /api/public/slots`, `POST /api/public/booking`, `POST /api/public/track`, the static landing
site, and the patient-portal sign-in. Everything else requires a JWT and is audited.

## Deliberately not built (and why)
- **Postgres driver** — needs a package install and a managed database; SQLite remains the default
  and every query already goes through one service layer (`tools.js` / `analytics.js`), so the swap
  is contained. The README documents the migration path.
- **SMS / WhatsApp gateway** — a provider account is per-clinic; the `webhook` provider is the seam.
- **Hindi UI** — the assistant already answers and *speaks* Hindi (HI-IN voice + Hinglish detection);
  a full UI translation is a bigger change than a feature and is tracked as a future item.

---

# v1.3.1 — sign-in UX + mobile pass (all ✅ built)

- **Login**: password visibility toggle (Eye/EyeOff), an "I'm a patient" CTA card straight to the portal,
  and 44px tap targets on the header links.
- **Mobile dashboard (≤600px)**: stat cards in an even 2×2 grid (the last card no longer spans the
  full row), larger labels/feet, 44px tap targets, off-canvas burger navigation, icon-only secondary
  toolbar links, a booking form that stacks, and a two-column week view.
- **Mobile admin / patient detail**: the same tap-target and grid passes; clinical record tabs
  (perio / files / prescriptions) stack with 40px targets.
- **Fix**: a signed-out patient opening `#/portal` used to be bounced to the doctor sign-in by the
  global 401 handler — portal endpoints are exempt now, so patients see their own sign-in card.
- **Tooling**: `test/responsive-check.js` audits any page at a phone viewport (sideways overflow,
  tiny text, small tap targets) and saves a screenshot; the browser E2E now includes a 390px pass.
