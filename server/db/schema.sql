-- DentEra schema — 15 tables, idempotent (CREATE IF NOT EXISTS), additive-only policy
-- clinic: 13 tables · chat history: 2 tables

CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN('dentist','admin','reception','patient')),
  email TEXT UNIQUE,
  password_hash TEXT,
  patient_id INTEGER REFERENCES patients(id),  -- set only for role='patient' (portal login)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dentists(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  specialty TEXT,
  room_no TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dob TEXT,
  phone TEXT,
  gender TEXT,
  medical_notes TEXT,          -- allergies / conditions (shown with a warning in the UI)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dentist_patients(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dentist_id INTEGER NOT NULL REFERENCES dentists(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(dentist_id, patient_id)
);

CREATE TABLE IF NOT EXISTS dentist_schedules(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dentist_id INTEGER NOT NULL REFERENCES dentists(id),
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS appointments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dentist_id INTEGER NOT NULL REFERENCES dentists(id),
  patient_id INTEGER REFERENCES patients(id),
  patient_name TEXT,           -- walk-in / public bookings may have no patient record yet
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN('scheduled','completed','cancelled','no_show')),
  reason TEXT,
  email TEXT,                    -- contact email collected on the booking forms
  address TEXT,                  -- postal address collected on the booking forms
  source TEXT NOT NULL DEFAULT 'doctor' CHECK(source IN('doctor','public')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS treatments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  default_cost INTEGER NOT NULL,          -- integer rupees, no floats
  default_minutes INTEGER NOT NULL,
  category TEXT NOT NULL CHECK(category IN('preventive','restorative','endodontic','periodontic','orthodontic','surgical','cosmetic','other'))
);

CREATE TABLE IF NOT EXISTS tooth_records(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  dentist_id INTEGER NOT NULL REFERENCES dentists(id),
  tooth_fdi TEXT NOT NULL,                -- validated in services/fdi.js before insert
  tooth_status TEXT NOT NULL CHECK(tooth_status IN('healthy','decayed','filled','root_canal','crowned','missing','implant')),
  condition TEXT,
  treatment_id INTEGER REFERENCES treatments(id),
  visit_date TEXT,
  cost INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS treatment_plans(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  dentist_id INTEGER NOT NULL REFERENCES dentists(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('draft','active','completed','cancelled')),
  total_estimate INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES treatment_plans(id),
  tooth_fdi TEXT,
  treatment_id INTEGER REFERENCES treatments(id),
  visit_no INTEGER NOT NULL DEFAULT 1,
  cost INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN('planned','done','cancelled'))
);

CREATE TABLE IF NOT EXISTS invoices(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  plan_id INTEGER REFERENCES treatment_plans(id),
  amount INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN('unpaid','partial','paid')),
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_doctor(
  id INTEGER PRIMARY KEY,
  q TEXT NOT NULL,
  keywords TEXT NOT NULL,      -- JSON array
  a TEXT NOT NULL              -- always ends with the safety line
);

CREATE TABLE IF NOT EXISTS assistant_audit(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  dentist_id INTEGER,
  action TEXT NOT NULL,
  tool_name TEXT,
  request_id TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  resource TEXT,
  resource_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- chat history (same design as Era v4.5's panel)
CREATE TABLE IF NOT EXISTS conversations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conversation_messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN('user','era')),
  text TEXT NOT NULL,
  tool TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================================================
-- v1.3.0 additions (additive-only): payments, expenses, inventory,
-- documents (X-rays), prescriptions, perio charting, reminders, notifications.
-- =====================================================================

-- money in: one row per payment against an invoice (receipt-grade history)
CREATE TABLE IF NOT EXISTS payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash' CHECK(method IN('cash','upi','card','bank','other')),
  reference TEXT,
  received_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- money out: practice running costs (rent, lab, salaries, material…)
CREATE TABLE IF NOT EXISTS expenses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN('rent','salary','lab','material','utility','marketing','equipment','other')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  spent_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- consumables: clinical store stock with low-stock warnings
CREATE TABLE IF NOT EXISTS inventory_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_qty INTEGER NOT NULL DEFAULT 5,
  unit_cost INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- every stock movement (+received, -consumed) keeps a reason
CREATE TABLE IF NOT EXISTS inventory_moves(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  delta INTEGER NOT NULL,
  reason TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- clinical files per patient (and optionally per tooth): X-rays, photos, reports
CREATE TABLE IF NOT EXISTS documents(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  tooth_fdi TEXT,
  kind TEXT NOT NULL DEFAULT 'other' CHECK(kind IN('xray','photo','report','consent','prescription','other')),
  filename TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'application/octet-stream',
  bytes INTEGER NOT NULL DEFAULT 0,
  stored_name TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- prescriptions: one header + medicine lines, printable (mirrors invoices)
CREATE TABLE IF NOT EXISTS prescriptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  dentist_id INTEGER REFERENCES dentists(id),
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis TEXT,
  advice TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS prescription_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  days INTEGER
);

-- periodontal charting: 6 sites per tooth (pocket depth, bleeding, recession)
CREATE TABLE IF NOT EXISTS perio_records(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  dentist_id INTEGER REFERENCES dentists(id),
  tooth_fdi TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS perio_measurements(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES perio_records(id) ON DELETE CASCADE,
  site INTEGER NOT NULL CHECK(site BETWEEN 1 AND 6),
  pocket_depth INTEGER NOT NULL,
  bleeding INTEGER NOT NULL DEFAULT 0,
  recession INTEGER NOT NULL DEFAULT 0
);

-- appointment reminders (confirmation on public booking, 24h nudge, follow-ups)
CREATE TABLE IF NOT EXISTS reminders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id),
  patient_name TEXT,
  phone TEXT,
  email TEXT,
  channel TEXT NOT NULL DEFAULT 'sms' CHECK(channel IN('sms','email','whatsapp')),
  kind TEXT NOT NULL CHECK(kind IN('confirmation','reminder_24h','followup','custom')),
  message TEXT NOT NULL,
  send_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sent','failed','skipped')),
  provider TEXT,
  error TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

-- in-app notifications (the bell + SSE stream)
CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audience TEXT NOT NULL DEFAULT 'staff' CHECK(audience IN('staff','dentist','patient')),
  user_id INTEGER REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pay_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_exp_spent ON expenses(spent_at);
CREATE INDEX IF NOT EXISTS idx_docs_patient ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_perio_patient ON perio_records(patient_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_rem_due ON reminders(status, send_at);
CREATE INDEX IF NOT EXISTS idx_notif_aud ON notifications(audience, read_at);

CREATE INDEX IF NOT EXISTS idx_appt_dentist_date ON appointments(dentist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_dp_dentist ON dentist_patients(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dp_patient ON dentist_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_patient ON tooth_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_plan_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_pitem_plan ON plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_user_day ON conversations(user_id, day);
CREATE INDEX IF NOT EXISTS idx_cmsg_conv ON conversation_messages(conversation_id);
