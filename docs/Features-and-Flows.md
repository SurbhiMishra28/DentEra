# DentEra — Features & Flows (consolidated guide)

**Version:** 1.3.0 · **Date:** 2026-10-21
Generated set: `docs/Features-and-Flows.md` (this file) · `docs/Features-and-Flows-Simple.md`
(plain language) · `docs/Backend-Flow.md` (server internals) · `docs/Full-Flow.md` (request walkthroughs).
Companion root docs: [../Features.md](../Features.md) (full implementation detail) · [../Flows.md](../Flows.md).

---

## Part 1 — Features (what exists)

Status: **v1.3.0 shipped** — 37/37 server tests green, production build passes, browser E2E zero console errors.

| ID | Feature | What you get | Endpoints | Screen |
|---|---|---|---|---|
| F1 | Auth & roles | 4 roles: dentist / admin / reception / patient; JWT 8h cookie; throttled login; demo personas | `/api/auth/*` | Login |
| F2 | Practice dashboard | today's visits, status chips, stat pills, search | `/api/appointments`, `/api/patients`, `/api/invoices` | Dashboard |
| F3 | Patient register | dentist-scoped patients; duplicate-phone protection; allergy notes | `/api/patients` | Dashboard |
| F4 | Appointments (CRUD) | book/move/cancel/no-show with **interval-overlap** clash detection; free-slot math | `/api/appointments`, `/api/slots` | Dashboard |
| F5 | Dental chart (FDI) | 32-tooth grid, 7 tooth states, immutable history per tooth | `/api/chart/:patientId` | PatientDetail |
| F6 | Treatments catalogue | 12 seeded treatments, default cost/minutes | `/api/treatments` | side panel |
| F7 | Treatment plans | multi-visit plans, per-item status, transactional insert | `/api/plans` | PatientDetail |
| F8 | Billing | invoice per plan/visit; partial/paid recompute; integer rupees | `/api/invoices` | Dashboard + PatientDetail |
| F9 | Public booking | the only unauthenticated write; 5/10min/IP; friendly 409 | `/api/public/slots`, `/api/public/booking`, `/api/public/track` | `/book` |
| F10 | AI brain | deterministic intent ladder (writes before reads); 15-topic KB with safety line | `/api/assistant/chat` | EraStage drawer |
| F11 | Sofia voice | EN/HI speech; browser/OS fallback; text always works | `/api/assistant/tts` | drawer |
| F12 | Chat history | per-day conversations, cross-user 404 | `/api/assistant/conversations` | drawer |
| F13 | Audit trail | every login/tool call/booking/500 with `request_id` | (server-side; view in Admin) | Admin |
| F14 | Health + static serving | `/api/health`; `client/dist` served `no-cache` on HTML; JSON 404 for unknown API | `/api/health` | — |
| F15 | Patient portal | phone (+dob) sign-in; scoped visits/bills/chart/files; book/cancel/pay | `/api/portal/*` | `#/portal` |
| F16 | Payments ledger | append + recompute; statement; UPI link | `/api/invoices/:id/payments` | PatientDetail |
| F17 | Expenses + P&L | money out by category; cash-basis profit & loss | `/api/expenses`, `/api/finance/pnl` | Admin |
| F18 | Inventory | stock levels, moves with reason, low-stock alerts | `/api/inventory*` | Admin |
| F19 | Documents | X-ray/photo uploads (≤6 MB) stored outside web root; per-tooth tagging | `/api/documents*` | PatientDetail |
| F20 | Prescriptions | header + medicine lines; print to PDF | `/api/prescriptions*` | PatientDetail |
| F21 | Perio charting | 6 sites/tooth: depth, bleeding, recession + summary | `/api/chart/:patientId/perio` | PatientDetail |
| F22 | Reminders | 24h plan + due runner; console or webhook provider; confirmations | `/api/admin/reminders*` | Admin |
| F23 | Notifications + SSE | bell in every console; instant push + polling fallback | `/api/notifications`, `/api/stream` | all |
| F24 | Analytics | trend, top treatments, utilisation, no-show rate (inline SVG) | `/api/analytics/*` | Dashboard + Admin |
| F25 | Recall | patients due for follow-up | `/api/recall` | Dashboard |
| F26 | Backups | daily snapshot, newest 7, on demand | `/api/admin/backups*` | Admin |
| F27 | Admin console | clinic-wide overview + staff/dentist/reminder/backup writes | `/api/admin/*` | Admin |
| F28 | Static storefront | landing + section pages + booking funnel (see below) | — | `#/` |
| F29 | Dark mode | system-following with persisted manual toggle | — | all |
| F30 | Security plumbing | global rate limiter + CSRF guard + uniform JSON errors | — | — |

### Static features (implementation detail)

| ID | Feature | Where | How |
|---|---|---|---|
| S1 | Page shell + hash router | `client/index.html`, `main.jsx`, `App.jsx` | one page app; `#/` routes incl. `/about /services /why-choose /gallery /blog` |
| S2 | Landing page | `pages/Landing.jsx` | guest home at `#/` when no session |
| S3 | Section pages | `pages/LandingSection.jsx` | one component drives all five sections |
| S4 | Public booking funnel | `pages/PublicBooking.jsx` | triage chip → 4 steps, no account |
| S5 | Mint theme + dark CSS | `dashboard.css`, `dashboard-v13.css`, `dark.css`, `pages/portal.css` | custom-property tokens |
| S6 | Theme behaviour | `theme.js` | system default + persisted toggle |
| S7 | Inline SVG icons + chart | `components/Icons.jsx`, `TrendChart.jsx` | zero icon/chart dependencies |
| S8 | Print pages | `utils/printRx.js`, `utils/receipt.js` | prescription/Rx/statement print windows |
| S9 | Static delivery | `server/index.js` | `express.static(dist)`, `no-cache` HTML, SPA fallback, JSON 404 for API |
| S10 | Build | `vite.config.mjs` | hashed outputs; dev proxy `/api → :8100` |

### CRUD operations (quick reference)

Key: 🔓 public · 🦷 dentist · 🖥 admin/reception · 👤 portal. Ownership is in the WHERE clause —
cross-dentist = **404**. Full per-resource table in [../Features.md](../Features.md).

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| Appointments | 🦷/🔓/👤 POST (clash-checked) | 🦷 GET list+detail, 🔓 slots | 🦷 PATCH move/status | 🦷 DELETE |
| Patients | 🦷 POST (auto-link, dup-phone→existing) | 🦷 GET `?q=` | — (append-only history) | — |
| Tooth records | 🦷 POST per tooth (FDI validated) | 🦷/👤 GET grouped chart | — (immutable log) | — |
| Perio | 🦷 POST 6 sites | 🦷 GET | — | — |
| Plans + items | 🦷 POST one transaction | 🦷/👤 GET | 🦷 PATCH item status | — |
| Invoices | auto on first done item | 🦷/🖥/👤 GET | 🦷 PATCH paid_amount | — |
| Payments | 🦷/👤 POST (recompute) | 🦷 GET history/statement | — | — |
| Expenses / Inventory | 🖥 POST | 🖥 GET (+P&L, moves) | 🖥 POST move (±stock) | — |
| Documents | 🦷 POST ≤6 MB | 🦷 GET list/file (authed stream) | — | 🦷 DELETE |
| Prescriptions | 🦷 POST | 🦷 GET | — | — |
| Reminders | 🖥 POST + run | 🖥 GET | 🖥 PATCH skip/re-open | — |
| Notifications | (server-generated) | 🦷/👤 GET + SSE | 🦷/👤 POST read | — |
| Dentists/Staff | 🖥 POST | 🖥 GET | 🔒 change-password | 🖥 DELETE staff/:id |
| Chat days | auto on turn | 🦷 GET | — | 🦷 DELETE |
| Backups | 🖥 POST | 🖥 GET | — | rotation newest 7 |

---

## Part 2 — Flows (how it behaves)

### System at a glance

```
BROWSER (React, ~/client)                SERVER (one process, :8100)              DISK
┌────────────────────────────┐   HTTP    ┌─────────────────────────────────┐   ┌──────────────┐
│ Landing / Booking / Portal │──────────▶│ limiter → csrf → parser → route │   │              │
│ Dashboard (day/week,       │  +cookie  │   └▶ auth → services/*.js       ├──▶│ dental.db    │
│   insights, pay, bell)     │──JSON───▶│       (tools/money/clinical/    │◀──│ (26 tables)  │
│ Admin / PatientDetail / Era│            │         analytics/reminders)    │   │ uploads/     │
└────────────────────────────┘            │   audit() on every state change │   │ backups/     │
        ▲  SSE `/api/stream` ◀────────────┘           → notify.js → bell   │   └──────────────┘
```

### Flow A — Guest books (static → write)
1. `#/` renders the landing; the Book card goes to `#/book` — no login.
2. Triage chip ("what brings you in?") sets reason + reserved length.
3. Pick dentist → date (next 14 days) → free slots from `GET /api/public/slots` (rate-limited).
4. Name + phone + email + address + reason → `POST /api/public/booking` → validation → `slotClash`
   (interval overlap) → INSERT `source='public'` → 201 → success card.
5. Instant confirmation reminder queued; staff bell rings (SSE); if the slot was taken meanwhile →
   409 → friendly re-pick.

### Flow B — Dentist signs in and works the day
1. `#/login` → email/username + password (throttled 8/15min pair, 30/IP) → JWT cookie → dashboard.
2. Dashboard fires parallel GETs (appointments, patients, invoices); pills computed client-side.
3. Booking studio: pick patient or walk-in → slot grid → `POST /api/appointments`.
4. Week view: drag a card to another day → `PATCH` (server re-checks overlap; clash refused).
5. Bell: SSE events mark new bookings/payments/low stock instantly.

### Flow C — Chart → plan → bill (the clinical loop)
1. Open patient → `GET /api/chart/:id` renders grouped history; tooth 16 shows its latest status.
2. Record treatment on 16 → `POST /api/chart/:id` (`validTooth` + ownership) → new history row.
3. Create plan ("Scaling, RCT 36, crown 36") → `POST /api/plans` one transaction → items planned.
4. Visits done → `PATCH plan item` → invoice auto-issued → `PATCH /api/invoices/:id` or
   `POST /api/invoices/:id/payments` → paid recompute → P&L updated.
5. Optional: upload X-ray (`POST /api/documents`), add Rx (print), record perio sites.

### Flow D — Ask Era (voice-first assistant)
1. Type or speak into EraStage → `POST /api/assistant/chat`.
2. `routeIntent` ladder runs writes before reads; `pickDateTime` parses 12h/24h, "aaj/kal".
3. `runTool` → `scopeDentist` (JWT is the only identity) → SQL in services → sanitize → sentence → audit.
4. Reply appears as a bubble; Sofia speaks it (EN/HI auto) via `/api/assistant/tts`, browser voice
   fallback if hosted TTS is down.

### Flow E — Patient portal
1. `#/portal` → phone (+dob) sign-in → scoped portal JWT.
2. Tabs: visits (book/cancel), bills (pay with method/reference), tooth records, shared files.
3. Portal booking re-uses the overlap check; payments go through the same ledger.

### Flow F — Ops and durability
- Reminder tick every 5 min: plan next-24h reminders, send due ones (console or webhook).
- Daily `db.backup()` snapshot to `server/db/backups/` (newest 7); on-demand from Admin.
- Every state change → `assistant_audit` row + optionally a `notifications` row → SSE bell.

### Failure behaviour (tested)

| Case | Status | User sees |
|---|---|---|
| No/expired token | 401 | "Please sign in…" |
| Login throttle exceeded | 429 | retry hint |
| Another dentist's chart/plan/invoice/file | 404 | no existence leak |
| Reception hits dentist-only tool | 200 `{denied:true}` | friendly guidance |
| Overlap on booking/move | 409 | "That time overlaps an appointment already booked." |
| Bad FDI/phone/PDF too big | 400 | field-specific message |
| NVIDIA TTS down | (fallback) | browser/OS voice; text always works |
| Some 500 | 500 | uniform JSON `{ok:false, error, request_id}` |
