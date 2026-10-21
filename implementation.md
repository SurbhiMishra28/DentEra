# DentEra — Implementation guide (how the build was done, file by file)

**Version:** 1.3.0 · **Date:** 2026-10-21
Companion to [Architecture.md](Architecture.md) (the WHAT) — this is the HOW, in build order, for the
**React + Express** stack. Everything below is ✅ shipped (Task.md has the checklist with ticks).

## 1. Build order (as shipped)

| Step | Files | Done when |
|---|---|---|
| 1. Scaffold | `package.json`, `.env.example`, `.gitignore`, `client/` (Vite React), `server/index.js` | `npm start` boots API :8100; `/api/health` 200; SPA fallback |
| 2. DB | `server/db/schema.sql`, `server/db/connection.js` | tables + seed on boot; second boot re-dates demo appointments |
| 3. Auth | `server/middleware/auth.js`, `routes/auth.js` | cookie login from the React login card; 401 without token; throttle |
| 4. Core API | `services/tools.js` + `routes/resources.js` (patients, appointments, slots, chart, plans, invoices, treatments, schedule) | dentist sees only own rows (supertest proves it) |
| 5. Chart | `services/fdi.js` + chart endpoints + `PatientDetail.jsx` | click tooth → update status → colour changes |
| 6. Plans/Invoices | in `routes/resources.js` + client pages | plan with 2 items → mark done → invoice paid |
| 7. Booking | `routes/publicBooking.js` + `PublicBooking.jsx` | guest books from another browser without login |
| 8. Assistant | `services/brain.js`, `services/tts.js`, `routes/assistant.js` + `EraStage.jsx` | voice question answered; drawer saves history |
| 9. Portal (v1.3) | `routes/portal.js` + `Portal.jsx` + `users.role='patient'` rebuild | phone+dob sign-in; scoped visits/bills/chart/files; book/cancel/pay |
| 10. Money (v1.3) | `services/money.js` + `routes/money.js` | payment ledger recompute, statement, UPI link; expenses; P&L |
| 11. Stock & ops (v1.3) | `routes/admin.js`, `services/reminders.js`, `services/backup.js` | inventory moves; reminders run due; daily snapshot rotation |
| 12. Clinical (v1.3) | `services/clinical.js` + `routes/clinical.js` | document upload/stream/delete; prescriptions; perio sites |
| 13. Insights & realtime (v1.3) | `services/analytics.js`, `services/notify.js`, `routes/insights.js`, `routes/staff.js` | trend/utilisation/recall; SSE bell |
| 14. UI v1.3 | `Dashboard.jsx` (week view, insights, pay), `Admin.jsx`, theme files | drag-to-move works; dark mode toggles; bell rings |
| 15. Tests/Deploy | `test/dental.test.js` (37), `test/browsertest.js`, `render.yaml` | green + build passes + Render Blueprint deploys |

## 2. Seed data (first boot, idempotent, re-dated)

- **Users:** Dr. Meera Iyer `meera@dental.local` (dentist 1), Dr. Arjun Shah `arjun@dental.local` (2),
  Reception `desk@dental.local` — password `password123`.
- **Patients (4):** Ravi Kumar, Sara Khan, Meena Iyer, Kavya Reddy — split 2/2 between dentists via
  `dentist_patients`.
- **Treatments catalogue (12):** Consultation 300/15min · Scaling 800/30 · Composite Filling 1200/30 ·
  RCT (per visit) 2500/45 · Crown (Metal-Ceramic) 4500/45 · Extraction (Simple) 900/20 · Surgical
  Extraction 2200/45 · Braces Consult 500/20 · Teeth Whitening 5000/60 · Implant (fixture) 25000/60 ·
  Fluoride Varnish 700/15 · Paediatric Filling 900/30 (integer rupees).
- **Appointments:** 4 rows — 2 today, 2 tomorrow, mixed dentists, one `source='public'`; re-dated every boot
  (reason prefix `APPOINTMENT …`).
- **Dentist schedules:** dentist 1 → Mon–Fri 09:00–17:00 · dentist 2 → Tue–Sat 10:00–18:00.
- **Tooth records (chart demo, Ravi):** 16 decayed, 36 root_canal + RCT record, 46 filled, 26 healthy-note.
- **Treatment plan (Sara):** "Full mouth rehab" active — items: Scaling (visit 1), RCT 36 (visit 2),
  Crown 36 (visit 3); invoice unpaid ₹8,300 (800+2500+4500+500 discount).
- **Dental KB (15 rows):** see §5.

## 3. The 13 tools (`server/services/tools.js` — scopeDentist bodyguard first)

| # | Tool | Type | Notes |
|---|---|---|---|
| 1 | `getMyAppointments` | read | date/`today`/`tomorrow`/week; joins patient name |
| 2 | `getMySchedule` | read | from `dentist_schedules` |
| 3 | `getMyPatients` | read | via `dentist_patients` join |
| 4 | `getPatientChart` | read | tooth_records grouped by tooth_fdi; **must verify patient belongs to dentist** |
| 5 | `getTreatments` | read | catalogue (public-safe data) |
| 6 | `getMyPlans` / 7 `getPlanDetails` | read | plan + items + totals |
| 8 | `getMyInvoices` | read | status filter; reception allowed |
| 9 | `getAvailableSlots` | read | schedule ∩ date − booked (interval overlap!) |
| 10 | `createAppointment` | write | slotClash check; `source:'doctor'` |
| 11 | `updateToothRecord` | write | FDI + status validated; appends history row |
| 12 | `createTreatmentPlan` | write | items[] atomic in one transaction |
| 13 | `markInvoicePaid` / `cancelAppointment` | write | ownership in WHERE; amounts recomputed |

Reception/admin: appointments + invoices + schedule only; chart/plan tools deny with the friendly
`denied:true` reply. v1.3 added brain-level extras: morning briefing, "move to the next free slot"
(a write that finds the earliest clash-free slot), and recall answers (`services/analytics.js`).

## 4. Intent ladder order (`brain.js`) — order IS correctness

`reschedule → cancel → markInvoicePaid → createPlan → updateToothRecord (incl. move-to-next-free-slot)
→ next appointment → patient chart → day view → slots → patients → plans → invoices → treatments
→ dental Q&A → greeting → help` (+ morning-briefing preamble)
(Write-intents before read-intents, exactly like Era fixed its "move appointment" bug.)

## 5. Dental knowledge base (15 rows, `server/services/knowledge.js`)

toothache · sensitivity · bleeding gums · bad breath · cavity · wisdom tooth · RCT fear/myths ·
braces care · brushing basics · flossing · baby teeth · staining/whitening · dry mouth ·
grinding (bruxism) · knocked-out tooth (emergency: 30-min window) — every answer ends with the
safety line: *"This is general guidance — please visit your dentist for real care."*

## 6. Test inventory (37 checks, supertest + node:test, scratch DB via `DB_FILE`)

1. **Isolation** — dentist A never reads/writes dentist B's chart/plan/appointment (tools + HTTP 404)
2. **FDI** — `validTooth('16')=true`, `('19')=false`, `('55')=true`, `('91')=false`, `'abc'`→400
3. **slotClash** — overlap refused (09:00–10:30 blocks 09:30), touching end allowed (10:30 OK)
4. **Public booking** — valid → 201 + `source:'public'`; bad phone → 400; past date → 400; taken slot → 409;
   6th attempt in 10 min → 429
5. **Auth** — no token → 401; wrong password → 401 (no user-existence leak); login throttle → 429
6. **Invoices/payments** — paid_amount recompute → partial/paid; overpayment refused; other dentist's invoice → 404
7. **Portal** — phone+dob sign-in; dentist token on portal route → 403; scoped rows only
8. **Documents** — MIME whitelist; >6 MB refused; cross-dentist file → 404 (never a byte)
9. **Money/inventory** — payments history + statement; expense log; P&L; stock move + low stock notice
10. **Plumbing** — SQL injection inert; global limiter backstop; CSRF guard; reception `denied:true` shape
11. **Browser E2E** (`test/browsertest.js`) — landing → login → dashboard → week view → insights →
    dark mode → bell → patient portal, zero console errors

## 7. Known traps (pre-solved here)

- Booking intent must extract **date+time** (12h/24h, "aaj/kal") *before* routing to create — Era's N1 bug.
- `slotClash` = **interval overlap**, never start-time equality — Era's N2 bug.
- Errors speak their **real reason** (409 = "slot taken"), not a fake access-denial — Era's N3 bug.
- Static files served `no-cache` on HTML; hashed assets in `client/dist`.
- Uploads are base64 in JSON → a dedicated 8 MB parser on `/api/documents` only; files stream via an
  authed route from `server/uploads/`.
- Concurrent doc/code editors: re-read before edit.
