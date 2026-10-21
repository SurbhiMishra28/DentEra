# DentEra

DentEra is a dental-practice demo for doctors, with appointment management, patient charts, treatment plans, billing, and the Era assistant.

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:8100`. To use Era's hosted female Sofia voice, set `NVIDIA_API_KEY` in a local `.env` file (or as a Render secret). If the hosted service is unavailable, Era prefers a female voice provided by the browser or operating system; text assistance remains available without either voice service.

## What's inside (v1.3.0)

- **Doctors & staff**: day view, booking studio, patients, FDI tooth chart, treatment plans, invoices, week view (drag a visit to another day), practice insights (revenue, treatments, utilisation, no-shows), recall list, Ask Era (voice in/out, morning briefing, "move to the next free slot").
- **Admin console**: clinic-wide overview, patients, billing with receipts, dentists, reception accounts, analytics, expenses & profit/loss, inventory with low-stock alerts, reminders, database backups, audit trail.
- **Patient portal** (`#/portal`): patients sign in with the phone number on file (plus date of birth when the clinic has it) and see their visits, bills, tooth records and shared files — and can book, cancel and pay.
- **Clinical records**: X-ray/report uploads per patient (and per tooth), printable prescriptions, and six-site periodontal charting.
- **Live**: new bookings, payments, low stock, backups and reminders appear in the notification bell instantly (SSE, with a polling fallback). Dark mode follows your system and can be toggled.

### Reminder delivery
Reminders work end-to-end with no external accounts: with no configuration the `console` provider logs each message and marks it sent, so the workflow is honest. Set `REMINDER_WEBHOOK_URL` to POST each reminder to your own SMS / email / WhatsApp relay instead.

### Data durability
The default store is SQLite (`server/db/dental.db`). A snapshot is taken every 24 hours and kept in `server/db/backups/` (newest seven). **Render's free tier has ephemeral disk** — treat this deployment as demo-only; real records need durable storage. The migration path is deliberately contained: every SQL statement lives in `services/tools.js`, `services/clinical.js`, `services/money.js` and `services/analytics.js`, so a Postgres driver swaps in behind those four modules (and `db/connection.js`), leaving routes and UI untouched.

## Tests

```sh
npm test      # 37 server checks (supertest, scratch DB)
node test/browsertest.js   # browser E2E: landing, login, dashboard, week view, insights, dark mode, bell, portal
```

## Deploy to Render

The repository-root `render.yaml` Blueprint deploys the DentEra service from `apps/dental`. Create a Blueprint from the repository and deploy the `dentera` web service. Render generates `JWT_SECRET` automatically and prompts for the optional `NVIDIA_API_KEY` as a secret; without it, the browser-provided female voice fallback is used.

The free service uses temporary local SQLite storage. Treat this deployment as a demo only: records can be lost when the service restarts or is redeployed. Do not enter real patient or other sensitive health information. Persistent clinic use needs durable database storage and appropriate privacy/security controls.
