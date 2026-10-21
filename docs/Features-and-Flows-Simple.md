# DentEra — Features & Flows, the simple version

**Version:** 1.3.0 · Plain-language companion to `docs/Features-and-Flows.md`.
Read this if you just want to know what the app does. No jargon below.

---

## What is DentEra?

A website for a dental clinic. It has three sides:

1. **The public website** — anyone visiting sees the clinic's landing page and can book an
   appointment online without calling or creating an account.
2. **The staff app** — dentists, reception and the admin manage everything: appointments,
   patient records, tooth charts, treatment plans, bills, payments, stock and reminders.
3. **The patient portal** — patients can sign in with their phone number (the one the clinic
   already has) to see their visits, bills, tooth records and files, and to book, cancel or pay.

## The main features in one line each

- **Bookings** — guests book online; staff book walk-ins; patients book in the portal. Two
  appointments can never overlap on the same chair/dentist.
- **Patient register** — each dentist sees only their own patients (patients are private between
  dentists). Typing an already-known phone number finds the patient instead of creating a copy.
- **Tooth chart** — a picture of all 32 teeth. Click a tooth to see its history and to record
  what was done (filling, root canal, crown, extraction…). History is never erased.
- **Treatment plans** — a multi-visit plan ("Scaling, then RCT on 36, then crown") where each
  step can be ticked off.
- **Bills and payments** — an invoice is made from the plan; receptions record cash/UPI/card
  payments (with reference numbers) and the bill automatically turns "partially paid" then "paid".
  There's also a UPI link you can copy and a printable receipt.
- **Ask Era (the assistant)** — a chat assistant. Ask "my appointments tomorrow", "show Ravi's
  chart", "create a plan for Sara: scaling, RCT on 36, crown on 36", "mark invoice 2 paid" and it
  does it — but only for your own data. It can speak the answers (English and Hindi voices).
- **Extras for care quality** — X-rays and photos per patient (even per tooth), printable
  prescriptions, gum measurements per tooth (6 sites: pocket depth, bleeding, recession).
- **Practice admin** — expenses and profit/loss, inventory of supplies with low-stock warnings,
  appointment reminders (sent to the console by default, or to your own SMS/email relay),
  database backups every day, and a full audit trail of who did what.
- **Live notices** — a bell in the app rings instantly when a booking, payment or low-stock
  event happens.
- **Looks** — one mint-green theme for everything, plus a dark mode that follows your system.

## How a day goes (the happy path)

1. **Morning:** the doctor signs in, sees today's appointments and the week view. The reception
   desk sees the same list with a "booked online" badge on internet bookings.
2. **A visitor arrives:** before signing in they may browse the landing page or book a slot
   themselves on the public page.
3. **During the visit:** the doctor opens the patient, marks the tooth treated, files the
   X-ray, writes the prescription, adds gum readings if needed.
4. **The plan:** if more visits are needed, the doctor creates a treatment plan; each visit
   ticks an item; the bill fills itself up.
5. **Payment:** the patient pays; reception records it; the bell rings; profit/loss updates.
6. **Evening:** reminders for tomorrow's visits are already queued; a database backup happens
   automatically.

## What the app will NOT do on purpose

- Take card payments online (payments are recorded by hand; UPI link is just a helper).
- Use an AI language model — the assistant is a fixed rules engine, which is safer in a medical
  context.
- Delete clinical history — tooth records, bills and payments stay forever on purpose.
- Hold real production data — the default database is SQLite with daily backups; for a real
  clinic you should move to a managed database (the docs explain how).

## Where everything lives

UI screens: `client/src/pages/` · server code: `server/routes/` and `server/services/` ·
database: `server/db/schema.sql` · tests: `test/dental.test.js` (37 checks) and
`test/browsertest.js` (clicks through the app in a browser).
