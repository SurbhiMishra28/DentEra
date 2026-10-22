# DentEra — Full Flow (requests, end to end)

**Version:** 1.3.0 · **Date:** 2026-10-21
Companion: `docs/Backend-Flow.md` (server internals). Ports: dev API :8100 (Vite :5173 proxies
`/api`), production single process on :8100.

## 0. Every request, first

```
Browser (api.js, credentials:'include')
  → [Render shell in prod / Vite proxy in dev] → :8100
  → rateLimit → csrf → parser (100 KB; 8 MB for /api/documents)
  → router guard (requireAuth / portal JWT / public limiter)
  → services/*.js (the only SQL) → dental.db
  → audit() → reply JSON {ok, data|error, request_id}
```

## 1. First visit (no session) — static storefront

1. `GET /` → `client/dist/index.html` (`Cache-Control: no-cache`) + hashed JS/CSS.
2. `App.jsx` runs `GET /api/auth/me` → 401/`null` → renders **Landing** at `#/`.
3. Guest browses `#/about`, `#/services`, `#/why-choose`, `#/gallery`, `#/blog` — pure client
   sections, zero API calls.

## 2. Public booking (unauthenticated write)

1. `#/book` → triage chip ("what brings you in?") → reason + reserved length stored client-side.
2. `GET /api/public/slots?dentist=1&date=…` → limiter check → schedule ∩ date − booked intervals.
3. `POST /api/public/booking` `{name, phone, email, address, date, time, reason}`:
   - validate: name ≤120, phone `^[0-9+\-\s]{7,15}$`, date within 14 days, HH:MM
   - `slotClash` (interval overlap, not start equality)
   - INSERT `appointments{source:'public', patient_id:NULL}` → 201
   - audit + instant `confirmation` reminder + SSE `notification` → staff bell
4. Conflict window: 409 "that slot was just taken" → client re-picks.
5. `POST /api/public/track` — the guest can check the booking later (phone-scoped).

## 3. Staff login → dashboard day

1. `#/login` → `POST /api/auth/login` → throttle counters (8/15min IP+email, 30/IP) → bcrypt
   verify → HS256 JWT 8h → `Set-Cookie: dent_token (HttpOnly)` → role routes the home screen:
   admin/reception → `#/admin`, dentist → `#/dashboard`.
2. Dashboard fires parallel `GET /api/appointments…`, `GET /api/patients…`, `GET /api/invoices…
   status=unpaid` (+ analytics + recall); stat pills computed client-side; poll while visible.
3. `GET /api/notifications` + `EventSource /api/stream` (SSE) → the bell; 60-s polling fallback.

## 4. Booking studio (staff CRUD)

`POST /api/appointments` `{patient_id|patient_name, date, start, minutes, reason}` →
`createAppointment` → `slotClash` → INSERT `source:'doctor'` → audit. Walk-in with a known
phone → `POST /api/patients` returns `existing:true` and links instead of duplicating.

Week view drag: `PATCH /api/appointments/:id` with a new date/time → server re-runs the overlap
check (the same guard protects moves) → clash refused with the 409 sentence.

Statuses: `PATCH` body `{status:'completed'|'cancelled'|'no_show'}` — `no_show` is the dental
extra vs the generic clinic pattern.

## 5. Clinical loop (chart → plan → bill)

1. `GET /api/chart/:patientId` → patient-ownership check via `dentist_patients` → records
   grouped by `tooth_fdi` + summary (`decayed:1, filled:2…`).
2. `POST /api/chart/:patientId` `{tooth_fdi:'16', tooth_status:'filled', treatment_id:2, cost:1200}`
   → `validTooth('16')` (adult 11–48) ✓ → own patient ✓ → INSERT history row. Status colour of
   tooth 16 flips; history grows (never erased).
3. `POST /api/plans` `{patient_id, title, items:[{treatment_id, tooth_fdi, visit_no, cost}…]}`
   → **one transaction**: INSERT `treatment_plans` + N `plan_items`.
4. `PATCH /api/plans/:planId/items/:itemId` `{status:'done'}` → recompute plan totals; the first
   done item issues the invoice (`amount`, `status:'unpaid'`).
5. `POST /api/invoices/:id/payments` `{amount, method:'upi', reference}` → append `payments` row
   → invoice recomputed from the **sum of payments** (overpayment refused; ≥due → `paid`,
   otherwise `partial`) → audit + SSE.
6. `GET /api/invoices/:id/statement` → printable receipt payload; `GET …/upi` → UPI deep link.

## 6. Sidebar of clinical extras

- **Documents:** `POST /api/documents` (JSON `{patient_id, tooth_fdi?, kind, filename, mime,
  bytes, dataBase64}`, ≤6 MB, MIME whitelist, 8 MB parser) → write to `server/uploads/` →
  `GET /api/documents/:id/file` streams through auth (cross-dentist = 404, never a byte) →
  `DELETE …/:id`.
- **Prescriptions:** `POST /api/prescriptions` `{patient_id, appointment_id?, diagnosis, advice,
  items:[{medicine, dose, frequency, days}]}` → printable via `utils/printRx.js`.
- **Perio:** `POST /api/chart/:patientId/perio` with 6 sites per tooth `{site, pocket_depth,
  bleeding, recession}` → summary verdict per tooth.

## 7. Ask Era (assistant write + read)

1. `POST /api/assistant/chat` `{message:'book an appointment tomorrow at 4 pm for Ravi'}`.
2. `requireAuth` → `routeIntent` ladder **writes before reads** → date/time parsed by
   `pickDateTime` (12h/24h, "aaj/kal") → `{tool:'createAppointment', args…}`.
3. `scopeDentist` (JWT overrides any client `dentist_id`) → `slotClash` → INSERT → audit →
   sanitize (no ids leak) → `toolReply` sentence: "Booked your appointment (#5)."
4. `logChatTurn` persists both bubbles under today's `conversations` (UNIQUE user_id+day).
5. `POST /api/assistant/tts` with the sentence → Sofia WAV (LRU-cached) → 🔊; hosted-down →
   browser/OS female voice; text reply already shown.
6. Chat history: `GET /api/assistant/conversations` (chips per day), `DELETE …/:id` (own only).

Read path example: "show Ravi's chart" → matches *patient chart* BEFORE dental Q&A →
`getPatientChart` → verified summary sentence → audit → speak.

Morning briefing / "move to the next free slot" (a write: find earliest clash-free slot and
PATCH) / recall answers all ride the same ladder.

## 8. Portal session (patient)

1. `#/portal` → phone (+dob) → `POST /api/portal/sign-in` (inside `routes/portal.js`) → portal
   JWT (`patientId`) → `GET /api/portal/me`.
2. Scoped reads: `/api/portal/appointments`, `/invoices`, `/chart`, `/plans`, `/documents`,
   `/notifications`.
3. Actions: `POST /api/portal/appointments` (overlap-checked, `source:'public'`),
   `POST …/:id/cancel`, `POST /api/portal/invoices/:id/payments` (same ledger + recompute).
4. A staff token on portal routes → 403; portal rows are all WHERE `patient_id=self`.

## 9. Admin + ops background loops

- `GET /api/admin/overview` (clinic-wide counts), `/audit`, staff CRUD (`POST /api/admin/staff`,
  `DELETE /api/admin/staff/:id`), dentists CRUD, reminder create/run/patch, backups list/create,
  inventory, expenses, P&L (routes shared with money.js for dentists where relevant).
- Background: every 5 min `reminders.generate()` + `runDue()` (console provider logs + marks
  sent; webhook relays to your SMS/email/WhatsApp system); daily `backup` snapshot (newest 7);
  each side effect raises a notification → SSE.

## 10. Failure paths you will meet

| Trigger | Reply |
|---|---|
| Expired cookie mid-use | 401 → `api.js` redirects to `#/login` |
| 6th booking attempt in 10 min | 429 |
| Another dentist's chart/plan/invoice/file | 404 (uniform, no leak) |
| Overlap on any create/move | 409 sentence |
| `tooth_fdi:'19'` | 400 validTooth |
| 7 MB document | 400 size/MIME |
| CSRF cross-site POST with cookie | blocked by the guard |
| TTS host down | text reply stands; browser voice fallback |
| Unknown server error | 500 + `{request_id}` in JSON for support |
