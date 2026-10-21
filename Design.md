# DentEra — Design (UI/UX)

**Version:** 1.3.0 · **Date:** 2026-10-21
Same design language as Era ([../Design.md](../Design.md)): one card, glass surfaces — but a **dental mint
theme** and a tooth-grid hero.

## 0. Screens (actual, v1.3 — all in `client/src/pages/`)

| Screen | Route | File | Who |
|---|---|---|---|
| Landing (guest home) | `#/` | `Landing.jsx` | visitors (no session) |
| Section pages | `/about /services /why-choose /gallery /blog` | `LandingSection.jsx` | visitors |
| Public booking | `#/book` | `PublicBooking.jsx` | visitors |
| Login | `#/login` (fallback when signed-out) | `Login.jsx` | staff + admin |
| Dashboard (dentist) | `#/dashboard` (home when doctor) | `Dashboard.jsx` + `dashboard.css` + `dashboard-v13.css` | dentists |
| Patient detail | `#/patients/:id` | `PatientDetail.jsx` | dentists |
| Admin console | `#/admin` (home when admin/reception) | `Admin.jsx` | admin, reception |
| Patient portal | `#/portal` | `Portal.jsx` + `pages/portal.css` | patients (phone + dob) |
| 404 | anything unknown | `NotFound.jsx` | everyone |

### ⓪ Landing + section pages (the static storefront)
Mint hero with clinic name, services preview and a prominent **Book an appointment** card that jumps
to `#/book`. Section pages reuse the same tokens from one component (`LandingSection`). No data, no
auth — pure static content once built.

### ① Login (`Login.jsx`)
Card: logo + "Dentist Login" + email-or-username/password + demo persona buttons (Dr. Meera/dentistA,
Dr. Arjun/dentistB). Doctors + admin only — NO auto sign-up (unknown email → 401), 429 throttle message kept.
The admin has NO demo button — she signs in with username `admin` + her password.

### ② Dashboard (`Dashboard.jsx` — the dentist home)
- **Header row:** dentist name/role + theme toggle + notification bell + Ask-Era button + Sign out
- **Day view:** today's appointments with status chips (Scheduled/Completed/No-show/Cancelled) and
  `source:public` badge; **Booking studio** button opens the inline booking form with live slots
- **Stats row:** 3 pills — Today's patients · Active plans · Unpaid invoices
- **Week view (v1.3):** 7 date columns; drag a visit card onto another day → `PATCH` (server re-checks overlap)
- **Insights (v1.3):** revenue/appointment trend (`TrendChart.jsx`, inline SVG), top treatments,
  chair utilisation
- **Recall (v1.3):** patients due for a return visit
- **Payments (v1.3):** record-payment modal (method cash/UPI/card/bank + reference) and UPI QR
- **Patient register:** searchable list → opens patient detail
- **Bell (v1.3):** `Notifications.jsx` — SSE-pushed events, mark-read; polling fallback
- **Dental chart (per patient):** the hero widget on the patient page (spec below)
- **Assistant:** the EraStage drawer (bubbles + per-day chips)
- **Theme (v1.3):** `ThemeToggle.jsx` + `theme.js` — follows system, persisted manual choice

### ③ Public booking (`PublicBooking.jsx`, `#/book` — no login)
Mint hero → triage chip ("what brings you in?") → 4 steps in one card: **1** pick dentist ·
**2** pick date (next 14 days) · **3** pick a free slot (from `/api/public/slots`) · **4** name +
phone + email + address + reason → confirm → success state with summary. Friendly errors:
"That slot was just taken — please pick another."

### ④ Admin console (`Admin.jsx` — home for admin/reception)
Clinic-wide overview, patients, billing with receipts, dentists, staff accounts, analytics,
expenses & P&L, inventory with low-stock alerts + restock shortcut, reminders (create/run/skip),
database backups, audit trail. Admin-only writes are gated server-side, not just hidden.

### ⑤ Patient portal (`Portal.jsx`, `#/portal`)
Sign in with the phone number on file (+ dob when the clinic has it) — no passwords. Tabs: visits
(book/cancel), bills (payment history + pay), tooth records, shared files. Own stylesheet
(`pages/portal.css`), same mint tokens. A dentist token hitting portal routes is a 403.

## 2. Dental chart widget (the core UI)

```
UPPER                        18 17 16 15 | 14 13 12 11          ← FDI quadrant 1
                             48 47 46 45 | 44 43 42 41          ← quadrant 4 (LOWER)
```

- Two rows of **8 tooth buttons** each (32 total, adult FDI). Each button = a mini tooth SVG
- **Colour = `tooth_status`:** healthy `#e8f6f4` · decayed `#fdecec` · filled `#e3eef3` ·
  root_canal `#f4e9ff` · crowned `#fff4dd` · missing (crossed out, `#eee`) · implant `#dff0ff`
- Click a tooth → side panel: history list (`tooth_records` rows) + actions:
  *Update status · Record treatment (picks from catalogue, stores cost) · Add note*
- Primary teeth (55–85) v1: dropdown behind "Show child teeth" toggle — grid stays adult by default
- Status colours are also the chart legend — always visible, not colour-only (icon shapes differ:
  ✓ filled, ✕ missing, ⚡ root canal) for accessibility

## 2.5 Dark mode (v1.3)
`dark.css` overrides the tokens under `[data-theme="dark"]`; `theme.js` defaults to the system
preference (`prefers-color-scheme`) and persists a manual choice. Every toolbar carries the toggle;
status colours were re-tuned so chart chips stay readable on dark surfaces.

## 3. Theme tokens (`dashboard.css` + `dashboard-v13.css`)

| Token | Value | Era equivalent |
|---|---|---|
| `--mint` | `#0fa795` (primary actions, user bubbles) | `--teal #1f9d9a` |
| `--mint2` | `#0b7c72` (gradient end) | `--teal2` |
| `--bg` | `#e9f6f3` aurora backdrop | `--bg #eaf4f6` |
| `--ink / --mut / --card` | `#10332e / #55746d / #fff` | same roles |
| Font | Manrope 400/600/800 | same |
| Card | `border-radius:28px`, glass blur, soft mint shadows | same |
| Animations | float/breathe/pop + `@media (prefers-reduced-motion: reduce)` kill-switch | same |

## 4. Assistant panel

Same component as Era's v4.5 chat panel: right drawer, `Today`/`Yesterday`/date chips, user bubble right
(mint), Era Dental bubble left (white), empty-state hint, notes row. Voice: replies auto-pick Sofia
EN-US/HI-IN exactly like Era (`isDevanagari`/Hinglish detection).

## 6. Static & print assets
- Print paths: `utils/printRx.js` (prescriptions) and `utils/receipt.js` (statements/receipts) open a
  print window — the browser dialog doubles as "Save as PDF".
- Icons live in `components/Icons.jsx` as inline SVG (no icon dependency); the trend chart is inline
  SVG too (`TrendChart.jsx`).
- Production serves `client/dist` — hashed asset filenames, `Cache-Control: no-cache` on HTML.

## 7. Accessibility & trust

- `aria-live` region for spoken replies (kept out of the chat drawer to avoid double announcement)
- Focus-visible rings on every control; tooth buttons are real `<button>`s with `aria-label="Tooth 16 — decayed"`
- Safety line under every dental Q&A answer: "This is general guidance — please visit your dentist for real care."
- Public booking page states clearly: no account needed, phone used only for the appointment
