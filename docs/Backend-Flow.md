# DentEra — Backend Flow (server internals)

**Version:** 1.3.0 · **Date:** 2026-10-21
Companion: `docs/Full-Flow.md` (request walkthroughs) · [../Architecture.md](../Architecture.md).

## 1. Boot sequence (`server/index.js`)

```
dotenv (.env wins over shell — but a junk PORT=0 still falls back to 8100)
  → express app + ORIGINS list (CORS, credentials)
  → dedicated 8 MB JSON parser for /api/documents (base64 uploads), 100 KB everywhere else
  → cookieParser
  → rateLimit.limiter   (global per-IP backstop: GET 600/min, writes 300/min)
  → csrf.csrfGuard      (cookie-session requests must be same-origin)
  → request-id middleware (randomBytes 6 → req.requestId, echoed in every JSON reply + audit)
  → GET /api/health     (counts ai_doctor rows + users — sanity signal)
  → routers, MOUNTED IN PRIORITY ORDER:
      /api/auth          auth.js
      /api               publicBooking.js   ← public, own stricter limiter (5/10 min/IP)
      /api               portal.js          ← phone+dob JWT, patient role
      /api               assistant.js       ← chat, conversations, tts
      /api/admin         admin.js           ← admin (+reception where allowed)
      /api               clinical.js        ← documents, prescriptions, perio
      /api               money.js           ← payments, expenses, inventory, P&L
      /api               insights.js        ← analytics, recall
      /api               staff.js           ← staff notifications + SSE
      /api               resources.js       ← the classic CRUD surface (router-level requireAuth)
      /api               RETURN JSON 404    ← never the SPA
  → express.static(client/dist), no-cache on *.html
  → SPA fallback → client/dist/index.html
  → central error handler (uniform JSON, 500s logged with requestId)
  if started directly (require.main === module):
  → app.listen(8100)
  → services/reminders.generate() + 5-minute tick (generate + runDue), unref'd
  → services/backup.startSchedule() (daily snapshot, newest 7)
```

## 2. Database layer

- `server/db/schema.sql` — 26 tables, idempotent `CREATE TABLE IF NOT EXISTS`, additive-only
  policy (the one guarded rebuild: `users` role CHECK widened to `reception`/`patient`).
- `server/db/connection.js` — better-sqlite3 open; `PRAGMA foreign_keys=ON`; DB_FILE fallback
  chain (tests point `DB_FILE` at a scratch file); seeds on first boot; **re-dates demo
  appointments every boot** so the dashboard is never empty.
- All money = integer rupees. All queries parameterized (`?`). No ORM.

## 3. The SQL owners (services only)

| Service | Owns |
|---|---|
| `tools.js` | clinic CRUD SQL: patients, appointments + `slotClash` (INTERVAL overlap), schedules, chart (with `fdi.validTooth`), plans, invoices |
| `money.js` | payments (append → recompute invoice from sum), expenses + P&L, inventory moves + low-stock checks |
| `clinical.js` | documents (MIME whitelist, ≤6 MB, uploads dir), prescriptions, perio sites + summary |
| `analytics.js` | trend, top treatments, utilisation, no-show rate, summary, recall list |
| `reminders.js` | `generate()` (next-24h plan), `runDue()` (provider: console or webhook), skip/custom |
| `backup.js` | `db.backup()` snapshot rotation |
| `notify.js` | `notifications` writes + SSE subscriber hub (audience staff/dentist/patient) |
| `audit.js`  | `assistant_audit` writer (login, tool calls, bookings, state changes — with requestId) |
| `brain.js`  | no SQL — routes intents to tools (writes before reads) |
| `tts.js`    | optional hosted Sofia call, LRU 20 — no clinic SQL |

`scopeDentist()` in `tools.js` is the bodyguard: the JWT is the ONLY source of `dentist_id`;
client-sent values are overridden. Ownership is in the WHERE clause; violators get **404**.

## 4. Auth shape

- Staff: `POST /api/auth/login` (email/username + password; bcrypt; throttle 8/15 min per
  IP+email, 30/IP; unknown user and wrong password are identical 401s) → JWT 8h in HttpOnly
  `dent_token` (+ Bearer accepted for curl). Cookie identity only.
- Portal: sign-in by patient phone (+ dob when the clinic has it) → separate JWT carrying
  `patientId`; dentist tokens on portal routes are a 403.
- Guard helpers: `requireAuth`, `requireRole('admin'…)`, `requireDentist` (chart/plan writes).

## 5. Error contract

Every JSON error: `{ ok:false, error:'CODE', request_id, message }`.
- 400 validation (field-specific message) · 401 unauthenticated · 403 role-wrong ·
  **404 cross-owner** (no existence leak) · 409 slot taken · 429 throttle · 500 uniform text
  ("Something went wrong on my side…"), logged with requestId.
- Reception hitting dentist-only assistant tools gets HTTP 200 with `denied:true` — a sentence,
  not an error.

## 6. Side effects of any state change

1. `audit()` row (who, what, requestId, success, truncated detail ≤300 chars).
2. `notify()` row + SSE push to the right audience (public booking, payment, low stock, backup,
   reminder run) — the bell updates instantly; the client falls back to 60-s polling.
3. Public bookings also queue an instant `confirmation` reminder.

## 7. Deployment shape (render.yaml)

One Render web service: `npm ci && npm run build && npm start` → Express serves the built Vite
app and the API on the same port. Generated `JWT_SECRET`; optional `NVIDIA_API_KEY`;
`REMINDER_WEBHOOK_URL` optional. Free-tier disk is ephemeral → demos only; Postgres migration
path is contained to the four SQL-owning services + `connection.js`.
