import React, { useEffect, useState } from "react"
import { api } from "../api.js"
import DentEraMark from "../components/DentEraMark.jsx"
import Notifications from "../components/Notifications.jsx"
import ThemeToggle from "../components/ThemeToggle.jsx"
import {
  Home, LayoutGrid, Calendar, Users, Wallet, Shield, ClipboardList, Globe,
  Stethoscope, Tooth, RotateCcw, AlertTriangle, LogOut, CalendarCheck, PieChart,
  ShieldCheck, UserRound, Check, BarChart, Plus, XMark, TrendingUp, Box, Database,
  Bell, Phone, UserRound as UserIcon,
} from "../components/Icons.jsx"
import StatusDonut, { STATUS_ORDER, STATUS_META } from "../components/StatusDonut.jsx"
import TrendChart from "../components/TrendChart.jsx"
import { downloadCSV, todayStamp } from "../utils/csv.js"
import { printReceipt } from "../utils/receipt.js"
import "../dashboard.css"
import "../dashboard-v13.css"

// Admin panel — clinic-wide view for role "admin" (and "reception", who share
// the same read scope on the server). Same shell as the doctor Dashboard
// (dashboard.css sidebar + ref-cards), read-only: invoice payments reuse the
// existing /api/invoices PATCH, everything else comes from /api/admin/*.
const fmt12 = t => { const [h, m] = (t || "").split(":").map(Number); if (Number.isNaN(h)) return t || ""
  const ap = h >= 12 ? "PM" : "AM"; return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ap}` }
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN")
const niceDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return s
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) }
const initial = n => (n || "?").replace(/^Dr\.?\s*/i, "").trim()[0]?.toUpperCase() || "?"
const prettyToday = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
const pad2 = n => String(n).padStart(2, "0")
const isoOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const todayIso = () => isoOf(new Date())
const shortDay = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return s
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-IN", { weekday: "short" }) }
const dayNum = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return ""
  return new Date(+m[1], +m[2] - 1, +m[3]).getDate() }
const prettyLong = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return s
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) }

const NAV = [
  ["overview", "Overview", Home],
  ["appointments", "Appointments", LayoutGrid],
  ["patients", "Patients", Users],
  ["analytics", "Analytics", BarChart],
  ["recall", "Recall", Phone],
  ["billing", "Billing", Wallet],
  ["expenses", "Expenses", TrendingUp],
  ["inventory", "Inventory", Box],
  ["reminders", "Reminders", Bell],
  ["doctors", "Doctors", Stethoscope],
  ["staff", "Staff", UserRound],
  ["backups", "Backups", Database],
  ["audit", "Audit trail", Shield],
  ["settings", "Settings", ShieldCheck],
]

const SECTION_COPY = {
  overview: { eyebrow: "ADMIN CONSOLE · CLINIC-WIDE", title: "Clinic overview",
    desc: "Everything happening across the practice — appointments, patients, revenue and Era's activity trail." },
  appointments: { eyebrow: "CLINIC-WIDE", title: "Appointments",
    desc: "Every dentist's bookings for the next 7 days — public bookings and doctor-made alike." },
  patients: { eyebrow: "CLINIC-WIDE", title: "Patients",
    desc: "The full clinic register across every dentist." },
  analytics: { eyebrow: "PRACTICE", title: "Analytics",
    desc: "Revenue, treatments, chair utilisation and the money in / money out picture for the clinic." },
  recall: { eyebrow: "FOLLOW-UP", title: "Recall list",
    desc: "Patients due for a check-up — last completed visit older than 6 months, or never seen." },
  billing: { eyebrow: "CLINIC-WIDE", title: "Billing",
    desc: "Invoices for the whole clinic — mark payments and print receipts as they come in." },
  expenses: { eyebrow: "MONEY OUT", title: "Expenses & profit",
    desc: "Every rupee the practice spends — logged by the front desk, summarised for the owner." },
  inventory: { eyebrow: "STORE", title: "Inventory",
    desc: "Consumables on the shelf — restock, consume, and watch the low-stock warnings." },
  reminders: { eyebrow: "PATIENTS", title: "Reminders",
    desc: "Appointment confirmations and 24-hour nudges — generate, send and skip." },
  doctors: { eyebrow: "TEAM", title: "Doctors",
    desc: "The clinic's dentists — add a new doctor and they can sign in right away." },
  staff: { eyebrow: "TEAM", title: "Staff accounts",
    desc: "Reception logins — they can run the front desk and billing, but never patient charts." },
  backups: { eyebrow: "DATA", title: "Backups",
    desc: "Daily database snapshots (the newest seven are kept). Create one right now any time." },
  audit: { eyebrow: "SECURITY", title: "Audit trail",
    desc: "The last 40 assistant and access events across the clinic." },
  settings: { eyebrow: "ACCOUNT", title: "Settings",
    desc: "Your admin account — change your sign-in password here." },
}

function Stat({ icon, iconClass, color, label, value, foot }) {
  return (
    <div className={`stat stat--${color}`}>
      <span className={`stat-icon ${iconClass}`} aria-hidden="true">{icon}</span>
      <div className="stat-body">
        <span className="statlabel">{label}</span>
        <span className="statnum">{value}</span>
        <span className="stat-foot">{foot}</span>
      </div>
    </div>
  )
}

function CardHead({ icon, eyebrow, title, right }) {
  return (
    <div className="ref-card-head">
      <div className="ref-card-title">
        <span className="ref-card-icon" aria-hidden="true">{icon}</span>
        <div><span className="panel-eyebrow">{eyebrow}</span><h3>{title}</h3></div>
      </div>
      {right && <span className="ref-card-date">{right}</span>}
    </div>
  )
}

export default function Admin({ me, onLogout }) {
  const [section, setSection] = useState("overview")
  const [ov, setOv] = useState(null)
  const [appts, setAppts] = useState([])
  const [patients, setPatients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [auditRows, setAuditRows] = useState([])
  const [doctors, setDoctors] = useState([])
  const [addDoc, setAddDoc] = useState({ name: "", email: "", password: "", specialty: "", room_no: "" })
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [msg, setMsg] = useState("")
  const [busyOut, setBusyOut] = useState(false)

  // v1.3 state
  const [insights, setInsights] = useState(null)
  const [trend, setTrend] = useState([])
  const [topTreatments, setTopTreatments] = useState([])
  const [util, setUtil] = useState([])
  const [pnl, setPnl] = useState(null)
  const [recall, setRecall] = useState([])
  const [expenses, setExpenses] = useState([])
  const [expForm, setExpForm] = useState({ category: "material", description: "", amount: "", spent_at: "" })
  const [items, setItems] = useState([])
  const [itemForm, setItemForm] = useState({ name: "", unit: "pcs", stock_qty: "", min_qty: "", unit_cost: "" })
  const [moves, setMoves] = useState(null)
  const [reminders, setReminders] = useState([])
  const [remForm, setRemForm] = useState({ patient_name: "", phone: "", channel: "sms", message: "", send_at: "" })
  const [backups, setBackups] = useState([])
  const [staff, setStaff] = useState([])
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "" })
  const [busy, setBusy] = useState(false)

  const isAdmin = me.role === "admin"
  const loadExpenses = async () => setExpenses((await api.get("/api/expenses")).data.data || [])

  async function loadDoctors() {
    const { data } = await api.get("/api/admin/dentists")
    setDoctors(data.data || [])
  }
  async function loadInvoices() {
    const { data } = await api.get("/api/invoices")
    setInvoices(data.data || [])
  }
  async function loadV13() {
    const safe = p => p.catch(() => ({ data: { data: null } }))
    const [an, tr, tt, ut, pl, rc, ex, inv, rm, bk, st] = await Promise.all([
      safe(api.get("/api/admin/analytics/summary")), safe(api.get("/api/admin/analytics/trend")),
      safe(api.get("/api/admin/analytics/top-treatments")), safe(api.get("/api/admin/analytics/utilization")),
      safe(api.get("/api/finance/pnl")), safe(api.get("/api/admin/recall")),
      safe(api.get("/api/expenses")), safe(api.get("/api/admin/inventory")),
      safe(api.get("/api/admin/reminders")), safe(api.get("/api/admin/backups")), safe(api.get("/api/admin/staff"))])
    setInsights(an.data.data || null); setTrend(tr.data.data || []); setTopTreatments(tt.data.data || [])
    setUtil(ut.data.data || []); setPnl(pl.data.data || null); setRecall(rc.data.data || [])
    setExpenses(ex.data.data || []); setItems(inv.data.data || []); setReminders(rm.data.data || [])
    setBackups(bk.data.data || []); setStaff(st.data.data || [])
  }
  useEffect(() => {
    ;(async () => {
      const [o, a, p, au] = await Promise.all([
        api.get("/api/admin/overview"), api.get("/api/admin/appointments?days=7"),
        api.get("/api/admin/patients"), api.get("/api/admin/audit")])
      setOv(o.data.data || null); setAppts(a.data.data || [])
      setPatients(p.data.data || []); setAuditRows(au.data.data || [])
      await Promise.all([loadInvoices(), loadDoctors(), loadV13()])
    })()
  }, [])

  async function pay(invId, full) {
    const inv = invoices.find(i => i.id === invId)
    const amount = full ? (inv.amount - inv.discount) : Math.round((inv.amount - inv.discount) / 2)
    const { data } = await api.patch(`/api/invoices/${invId}`, { paid_amount: amount })
    setMsg(data.data ? `Invoice #${invId} → ${data.data.status}.` : (data.message || "Failed."))
    await loadInvoices()
  }

  async function print(invId) {
    const { data } = await api.get(`/api/admin/invoices/${invId}`)
    if (data && data.data) printReceipt(data.data)
    else setMsg("Could not load the receipt.")
  }

  async function addDoctor(e) {
    e.preventDefault(); setMsg("")
    const { status, data } = await api.post("/api/admin/dentists", addDoc)
    if (status === 201) {
      setMsg(`${addDoc.name} added — they can sign in with ${addDoc.email} now.`)
      setAddDoc({ name: "", email: "", password: "", specialty: "", room_no: "" })
      await loadDoctors()
    } else setMsg(data.message || "Could not add the doctor.")
  }

  async function changePassword(e) {
    e.preventDefault(); setMsg("")
    if (pw.next !== pw.confirm) { setMsg("The new passwords do not match."); return }
    const { status, data } = await api.post("/api/auth/change-password", { current: pw.current, next: pw.next })
    if (status === 200) { setMsg(data.message || "Password updated."); setPw({ current: "", next: "", confirm: "" }) }
    else setMsg(data.message || "Could not change the password.")
  }

  // ---------- v1.3 actions ----------
  async function addExpense(e) {
    e.preventDefault(); setMsg("")
    const { status, data } = await api.post("/api/expenses", expForm)
    if (status === 201) {
      setMsg(`Expense logged — ${money(data.data.amount)} for ${expForm.description}.`)
      setExpForm({ category: "material", description: "", amount: "", spent_at: "" })
      await Promise.all([loadExpenses(), loadV13()])
    } else setMsg(data.message || "Could not save the expense.")
  }

  async function moveStock(id, delta) {
    const { status, data } = await api.post(`/api/inventory/${id}/move`, { delta, reason: delta > 0 ? "Restock" : "Used in clinic" })
    setMsg(status === 200 ? `${data.data.name}: ${data.data.stock_qty} ${data.data.low ? "— LOW STOCK" : "in stock"}` : (data.message || "Could not adjust stock."))
    if (status === 200) { setItems(list => list.map(i => i.id === id ? { ...i, stock_qty: data.data.stock_qty, low: data.data.low ? 1 : 0 } : i)); loadV13() }
  }

  async function addItem(e) {
    e.preventDefault(); setMsg("")
    const { status, data } = await api.post("/api/inventory", itemForm)
    if (status === 201) {
      setMsg(`Added ${data.data.name} to the store.`)
      setItemForm({ name: "", unit: "pcs", stock_qty: "", min_qty: "", unit_cost: "" })
      loadV13()
    } else setMsg(data.message || "Could not add the item.")
  }

  async function runReminders() {
    setBusy(true); setMsg("")
    const { status, data } = await api.post("/api/admin/reminders/run")
    setBusy(false)
    if (status === 200) {
      setMsg(`${data.data.planned} reminder(s) planned, ${data.data.sent} sent (provider: ${data.data.provider}).`)
      loadV13()
    } else setMsg(data.message || "Could not run the reminders.")
  }

  async function skipReminder(id, status) {
    const r = await api.patch(`/api/admin/reminders/${id}`, { status })
    setMsg(r.status === 200 ? "Reminder updated." : (r.data.message || "Could not update the reminder."))
    loadV13()
  }

  async function createReminder(e) {
    e.preventDefault(); setMsg("")
    const { status, data } = await api.post("/api/admin/reminders", remForm)
    if (status === 201) { setMsg("Reminder queued."); setRemForm({ patient_name: "", phone: "", channel: "sms", message: "", send_at: "" }); loadV13() }
    else setMsg(data.message || "Could not queue the reminder.")
  }

  async function createBackup() {
    setBusy(true); setMsg("")
    const { status, data } = await api.post("/api/admin/backups")
    setBusy(false)
    if (status === 201) { setMsg(`Backup created — ${data.data.name} (${(data.data.bytes / 1024).toFixed(0)} KB).`); loadV13() }
    else setMsg(data.message || "Could not create the backup.")
  }

  async function addStaff(e) {
    e.preventDefault(); setMsg("")
    const { status, data } = await api.post("/api/admin/staff", staffForm)
    if (status === 201) {
      setMsg(`${data.data.name} can now sign in with ${data.data.email}.`)
      setStaffForm({ name: "", email: "", password: "" }); loadV13()
    } else setMsg(data.message || "Could not add the staff account.")
  }

  async function removeStaff(id) {
    const { status, data } = await api.del(`/api/admin/staff/${id}`)
    setMsg(status === 200 ? "Staff account removed." : (data.message || "Could not remove the account."))
    if (status === 200) loadV13()
  }

  async function showMoves(id) {
    const { data } = await api.get(`/api/inventory/${id}/moves`)
    setMoves({ item_id: id, rows: data.data || [] })
  }

  async function logout() {
    setBusyOut(true)
    try { await api.post("/api/auth/logout") } catch { /* cookie may already be gone */ }
    if (onLogout) onLogout()
    location.hash = "#/"
  }

  const copy = SECTION_COPY[section]
  const dentistName = a => a.dentist || "—"

  // ---- overview analytics (clinic-wide, computed from the 7-day appointment list) ----
  const statusCounts = { scheduled: 0, completed: 0, no_show: 0, cancelled: 0 }
  appts.forEach(a => { if (statusCounts[a.status] != null) statusCounts[a.status]++ })
  const statusTotal = appts.length
  const nextAppt = [...appts].filter(a => a.status === "scheduled")
    .sort((x, y) => (x.appointment_date + x.start_time).localeCompare(y.appointment_date + y.start_time))[0] || null
  const dayMap = {}
  appts.forEach(a => { dayMap[a.appointment_date] = (dayMap[a.appointment_date] || 0) + 1 })
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); const iso = isoOf(d)
    return { date: iso, count: dayMap[iso] || 0 }
  })
  const weekMax = Math.max(1, ...week.map(w => w.count))
  const exportAppointments = () => downloadCSV(`dentera-appointments-${todayStamp()}.csv`,
    ["ID", "Date", "Start", "End", "Dentist", "Patient", "Reason", "Source", "Status"],
    appts.map(a => [a.id, a.appointment_date, a.start_time, a.end_time, a.dentist, a.registered_patient || a.patient_name || "Walk-in", a.reason, a.source, a.status]))
  const exportPatients = () => downloadCSV(`dentera-patients-${todayStamp()}.csv`,
    ["ID", "Name", "Phone", "Gender", "Dentists", "Visits", "Medical notes"],
    patients.map(p => [p.id, p.name, p.phone, p.gender, p.dentists, p.visits, p.medical_notes]))
  const exportInvoices = () => downloadCSV(`dentera-invoices-${todayStamp()}.csv`,
    ["ID", "Patient ID", "Amount", "Discount", "Paid", "Status", "Issued"],
    invoices.map(i => [i.id, i.patient_id, i.amount, i.discount, i.paid_amount, i.status, (i.issued_at || "").slice(0, 16)]))
  const exportAudit = () => downloadCSV(`dentera-audit-${todayStamp()}.csv`,
    ["ID", "When", "User", "Action", "Tool", "Result", "Detail"],
    auditRows.map(r => [r.id, r.created_at, r.user, r.action, r.tool_name, r.success ? "ok" : "failed", r.detail]))

  return (
    <div className="view dashboard-page">
      <aside className="dashboard-sidebar" aria-label="Admin navigation">
        <a className="brand dashboard-brand" href="#/" aria-label="DentEra home">
          <span className="brand-mark"><DentEraMark /></span>
          <span>DentEra<small>ADMIN WORKSPACE</small></span>
        </a>

        <div className="ref-profile">
          <span className="ref-profile-avatar" aria-hidden="true">{initial(me.name)}</span>
          <b>{me.name}</b>
          <small>Administrator</small>
        </div>

        <nav className="dashboard-nav" aria-label="Admin sections">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} type="button" className={section === id ? "is-active" : ""}
              aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}>
              <span aria-hidden="true"><Icon size={17} /></span>{label}
            </button>
          ))}
        </nav>

        <button type="button" className="ref-signout" onClick={logout} disabled={busyOut}>
          <LogOut size={16} /> {busyOut ? "Signing out…" : "Sign out"}
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="topbar dashboard-toolbar">
          <h1 className="ref-topbar-title">Admin Panel</h1>
          <span className="spacer" />
          <ThemeToggle />
          <Notifications />
          <a className="mini" href="#/dashboard" title="Doctor dashboard" aria-label="Doctor dashboard"><Stethoscope size={14} /><span className="hide-sm">Doctor dashboard</span></a>
          <a className="mini" href="#/book" title="Public booking" aria-label="Public booking"><Globe size={14} /><span className="hide-sm">Public booking</span></a>
          <a className="mini" href="#/portal" title="Patient portal" aria-label="Patient portal"><Tooth size={14} /><span className="hide-sm">Patient portal</span></a>
          <button className="mini" onClick={() => window.location.reload()}><RotateCcw size={14} /> Refresh</button>
        </div>

        <div className="pagehead">
          <div>
            <span className="dashboard-eyebrow">{copy.eyebrow}</span>
            <h2 className="ref-pagehead-title">{copy.title}</h2>
            <p className="muted">{copy.desc}</p>
          </div>
        </div>

        {msg && <p className="authmsg ok" role="status" aria-live="polite">{msg}</p>}

        {section === "overview" && ov && <>
          <div className="stats ref-stats ref-stats--4">
            <Stat icon={<CalendarCheck size={20} />} iconClass="stat-icon--sky" color="sky"
              label="APPOINTMENTS TODAY" value={ov.appts_today} foot={prettyToday()} />
            <Stat icon={<Calendar size={20} />} iconClass="stat-icon--green" color="mint"
              label="NEXT 7 DAYS" value={ov.appts_week} foot="across all dentists" />
            <Stat icon={<Users size={20} />} iconClass="stat-icon--teal" color="teal"
              label="PATIENTS" value={ov.patients} foot="in the clinic register" />
            <Stat icon={<Wallet size={20} />} iconClass="stat-icon--sky" color="sky"
              label="UNPAID REVENUE" value={money(ov.unpaid_due)} foot="awaiting collection" />
          </div>

          <div className="ref-grid ref-grid--a">
            <section className="panel ref-card">
              <CardHead icon={<PieChart size={17} />} eyebrow="UPCOMING WEEK" title="Status split" right={`${statusTotal} appointments`} />
              <div className="ref-donut-wrap">
                <StatusDonut counts={statusCounts} total={statusTotal} caption="this week" />
                <ul className="ref-legend">
                  {STATUS_ORDER.map(k => (
                    <li key={k}><i style={{ background: STATUS_META[k].color }} aria-hidden="true" />
                      <span>{STATUS_META[k].label}</span><b>{Math.round(((statusCounts[k] || 0) / (statusTotal || 1)) * 100)}%</b></li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="panel ref-card">
              <CardHead icon={<CalendarCheck size={17} />} eyebrow="UP NEXT" title="Next appointment"
                right={nextAppt ? <span className={"stchip st-" + nextAppt.status}>{nextAppt.status.replace("_", " ")}</span> : null} />
              {nextAppt ? (
                <div className="ref-next">
                  <div className="ref-next-head">
                    <span className="ref-next-avatar" aria-hidden="true">{initial(nextAppt.registered_patient || nextAppt.patient_name)}</span>
                    <div>
                      <b>{nextAppt.registered_patient || nextAppt.patient_name || "Walk-in"}</b>
                      <small>{nextAppt.reason || "Consultation"} · {nextAppt.dentist}{nextAppt.source === "public" ? " · public booking" : ""}</small>
                    </div>
                  </div>
                  <div className="ref-next-meta">
                    <div><small>Time</small><b>{fmt12(nextAppt.start_time)}</b></div>
                    <div><small>Ends</small><b>{fmt12(nextAppt.end_time)}</b></div>
                    <div><small>Day</small><b>{shortDay(nextAppt.appointment_date)} {dayNum(nextAppt.appointment_date)}</b></div>
                  </div>
                  <p className="ref-next-note"><ClipboardList size={14} /> {prettyLong(nextAppt.appointment_date)} — with {nextAppt.dentist}.</p>
                </div>
              ) : (
                <p className="empty"><CalendarCheck size={22} /> Nothing scheduled this week — a quiet clinic is a happy clinic.</p>
              )}
            </section>
          </div>

          <div className="ref-grid ref-grid--b">
            <section className="panel ref-card">
              <CardHead icon={<BarChart size={17} />} eyebrow="WORKLOAD" title="Next 7 days"
                right={`${week.reduce((s, w) => s + w.count, 0)} visits scheduled`} />
              <div className="ref-bars" role="img" aria-label="Appointments per day for the next 7 days">
                {week.map(w => (
                  <div key={w.date} className="ref-bar-col" title={`${prettyLong(w.date)} — ${w.count} appointment${w.count === 1 ? "" : "s"}`}>
                    <span className="ref-bar-count">{w.count || ""}</span>
                    <span className="ref-bar-track"><i className={"ref-bar" + (w.date === todayIso() ? " is-today" : "")}
                      style={{ height: `${Math.max(8, (w.count / weekMax) * 100)}%` }} /></span>
                    <span className="ref-bar-label">{shortDay(w.date)}<small>{dayNum(w.date)}</small></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel ref-card">
              <CardHead icon={<LayoutGrid size={17} />} eyebrow="THIS WEEK" title="Status breakdown" right={`${statusTotal} appointments`} />
              <div className="ref-statuses">
                {STATUS_ORDER.map(k => {
                  const pct = Math.round(((statusCounts[k] || 0) / (statusTotal || 1)) * 100)
                  return (
                    <div key={k} className="ref-status-row">
                      <span className="ref-status-label">{STATUS_META[k].label}</span>
                      <span className="ref-status-track"><i style={{ width: `${statusTotal ? pct : 0}%`, background: STATUS_META[k].color }} /></span>
                      <span className="ref-status-val">{statusCounts[k] || 0}<small> {pct}%</small></span>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <section className="panel ref-card">
            <CardHead icon={<Tooth size={17} />} eyebrow="AT A GLANCE" title="Clinic resources" />
            <div className="ref-glance">
              <div><small>ACTIVE PLANS</small><b>{ov.plans_active}</b><span className="muted">treatment plans in progress</span></div>
              <div><small>PUBLIC BOOKINGS</small><b>{ov.public_bookings}</b><span className="muted">self-booked online</span></div>
              <div><small>DENTISTS / USERS</small><b>{ov.dentists}/{ov.users}</b><span className="muted">registered accounts</span></div>
              <div><small>TREATMENTS</small><b>{ov.treatments}</b><span className="muted">in the catalogue</span></div>
            </div>
          </section>

          <section className="panel ref-card">
            <CardHead icon={<PieChart size={17} />} eyebrow="LIVE" title="Recent activity"
              right={<span className="rowgap" style={{ marginTop: 0 }}><button className="mini" onClick={exportAudit}>Export CSV</button><span>latest 10 events</span></span>} />
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>When</th><th>User</th><th>Action</th><th>Tool</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>
                  {auditRows.slice(0, 10).map(r => (
                    <tr key={r.id}>
                      <td className="muted">{(r.created_at || "").replace("T", " ").slice(0, 16)}</td>
                      <td>{r.user || "—"}</td>
                      <td>{r.action}</td>
                      <td className="muted">{r.tool_name || "—"}</td>
                      <td><span className={"stchip " + (r.success ? "st-scheduled" : "st-cancelled")}>{r.success ? "ok" : "failed"}</span></td>
                      <td className="muted">{r.detail || ""}</td>
                    </tr>
                  ))}
                  {auditRows.length === 0 && <tr><td colSpan="6" className="empty">No events yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>}

        {section === "appointments" && (
          <section className="panel ref-card">
            <CardHead icon={<Calendar size={17} />} eyebrow="UPCOMING" title="Appointments — next 7 days"
              right={<span className="rowgap" style={{ marginTop: 0 }}><button className="mini" onClick={exportAppointments}>Export CSV</button><span>{appts.length} booked</span></span>} />
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>When</th><th>Dentist</th><th>Patient</th><th>Reason</th><th>Source</th><th>Status</th></tr></thead>
                <tbody>
                  {appts.map(a => (
                    <tr key={a.id}>
                      <td><b>{niceDate(a.appointment_date)}</b><br /><span className="muted">{fmt12(a.start_time)}–{fmt12(a.end_time)}</span></td>
                      <td>{dentistName(a)}</td>
                      <td>{a.registered_patient || a.patient_name || "Walk-in"}</td>
                      <td className="muted">{a.reason || "—"}</td>
                      <td>{a.source === "public" ? <span className="badge">public</span> : <span className="badge blue">doctor</span>}</td>
                      <td><span className={"stchip st-" + a.status}>{a.status.replace("_", " ")}</span></td>
                    </tr>
                  ))}
                  {appts.length === 0 && <tr><td colSpan="6" className="empty">Nothing booked this week.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "patients" && (
          <section className="panel ref-card">
            <CardHead icon={<Users size={17} />} eyebrow="REGISTER" title="Patients — all dentists"
              right={<span className="rowgap" style={{ marginTop: 0 }}><button className="mini" onClick={exportPatients}>Export CSV</button><span>{patients.length} on file</span></span>} />
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Dentists</th><th>Visits</th><th>Alerts</th></tr></thead>
                <tbody>
                  {patients.map(p => (
                    <tr key={p.id}>
                      <td className="muted">{p.id}</td>
                      <td><a href={`#/patients/${p.id}`}><b>{p.name}</b></a>{p.gender ? <span className="muted"> · {p.gender}</span> : ""}</td>
                      <td>{p.phone || "—"}</td>
                      <td className="muted">{p.dentists || "—"}</td>
                      <td>{p.visits}</td>
                      <td>{p.medical_notes ? <span className="warnpill pill"><AlertTriangle size={11} /> {p.medical_notes}</span> : "—"}</td>
                    </tr>
                  ))}
                  {patients.length === 0 && <tr><td colSpan="6" className="empty">No patients on file.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === "billing" && (
          <section className="panel ref-card">
            <CardHead icon={<Wallet size={17} />} eyebrow="REVENUE" title="Invoices — whole clinic"
              right={<span className="rowgap" style={{ marginTop: 0 }}><button className="mini" onClick={exportInvoices}>Export CSV</button><span>{invoices.length} invoices</span></span>} />
            <ul className="list">
              {invoices.map(i => (
                <li key={i.id} className="invrow">
                  <span><b>#{i.id}</b> {money(i.amount)}{i.discount ? ` − ${money(i.discount)}` : ""} · paid {money(i.paid_amount)}</span>
                  <span className="rowgap">
                    <span className={"stchip st-" + i.status}>{i.status}</span>
                    <button className="mini" onClick={() => print(i.id)}>Print receipt</button>
                    {i.status !== "paid" && <button className="mini" onClick={() => pay(i.id, true)}>mark fully paid</button>}
                    {i.status === "unpaid" && <button className="mini" onClick={() => pay(i.id, false)}>half payment</button>}
                  </span>
                </li>
              ))}
              {invoices.length === 0 && <p className="empty">No invoices on file.</p>}
            </ul>
          </section>
        )}

        {section === "doctors" && (
          <section className="panel ref-card">
            <CardHead icon={<Stethoscope size={17} />} eyebrow="TEAM" title="Doctors — all dentists" right={`${doctors.length} doctors`} />
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>Name</th><th>Email (sign-in)</th><th>Specialty</th><th>Room</th><th>Since</th></tr></thead>
                <tbody>
                  {doctors.map(d => (
                    <tr key={d.id}>
                      <td className="muted">{d.id}</td>
                      <td><span className="doctor-identity"><span className="doctor-avatar" aria-hidden="true">{initial(d.name)}</span><b>{d.name}</b></span></td>
                      <td>{d.email || "—"}</td>
                      <td className="muted">{d.specialty || "—"}</td>
                      <td className="muted">{d.room_no || "—"}</td>
                      <td className="muted">{(d.created_at || "").slice(0, 10)}</td>
                    </tr>
                  ))}
                  {doctors.length === 0 && <tr><td colSpan="6" className="empty">No doctors yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <form className="dash-book" style={{ marginTop: "1.2rem" }} onSubmit={addDoctor} aria-label="Add a doctor">
              <div className="dash-book__banner">
                <span className="dash-book__banner-icon" aria-hidden="true"><UserRound size={26} /></span>
                <div>
                  <h3>Add a doctor</h3>
                  <p>They can sign in immediately with the email + temporary password (Mon–Fri 9–5 schedule is created automatically).</p>
                </div>
              </div>
              <div className="rowForm">
                <div className="grid3">
                  <label>Doctor name<input value={addDoc.name} onChange={e => setAddDoc({ ...addDoc, name: e.target.value })} placeholder="Dr. Kavya Nair" required /></label>
                  <label>Email (sign-in)<input type="email" value={addDoc.email} onChange={e => setAddDoc({ ...addDoc, email: e.target.value })} placeholder="kavya@dental.local" required /></label>
                  <label>Temporary password<input value={addDoc.password} onChange={e => setAddDoc({ ...addDoc, password: e.target.value })} placeholder="at least 6 characters" minLength={6} required /></label>
                  <label>Specialty<input value={addDoc.specialty} onChange={e => setAddDoc({ ...addDoc, specialty: e.target.value })} placeholder="General Dentistry" /></label>
                  <label>Room (optional)<input value={addDoc.room_no} onChange={e => setAddDoc({ ...addDoc, room_no: e.target.value })} placeholder="OPD-3" /></label>
                </div>
                <button type="submit" className="dash-cta-btn"><Check size={15} /> Add doctor</button>
              </div>
            </form>
          </section>
        )}

        {/* ---------- v1.3: analytics ---------- */}
        {section === "analytics" && (
          <>
            <div className="stats ref-stats ref-stats--4">
              <Stat icon={<Wallet size={20} />} iconClass="stat-icon--green" color="mint"
                label="COLLECTED (30 DAYS)" value={money(insights?.revenue_collected)} foot="payments recorded" />
              <Stat icon={<CalendarCheck size={20} />} iconClass="stat-icon--sky" color="sky"
                label="APPOINTMENTS" value={insights?.appointments ?? 0} foot={`${insights?.completed ?? 0} completed`} />
              <Stat icon={<AlertTriangle size={20} />} iconClass="stat-icon--amber" color="amber"
                label="NO-SHOW RATE" value={`${insights?.no_show?.rate ?? 0}%`} foot={`${insights?.no_show?.no_shows ?? 0} of ${insights?.no_show?.total ?? 0}`} />
              <Stat icon={<Users size={20} />} iconClass="stat-icon--teal" color="teal"
                label="NEW PATIENTS" value={insights?.new_patients ?? 0} foot="added in this window" />
            </div>

            <div className="ref-grid ref-grid--b">
              <section className="panel ref-card">
                <CardHead icon={<BarChart size={17} />} eyebrow="REVENUE & VISITS" title="Daily trend (30 days)" />
                <TrendChart data={trend} />
                <div className="trendlegend" aria-hidden="true">
                  <span><i /> Money collected</span><span><i className="dot" /> Appointments</span>
                </div>
              </section>
              <section className="panel ref-card">
                <CardHead icon={<Wallet size={17} />} eyebrow="MONEY IN / MONEY OUT" title="Profit & loss"
                  right={`${pnl ? `${pnl.from} → ${pnl.to}` : ""}`} />
                <ul className="list">
                  <li className="invrow"><span>Collected from patients</span><b>{money(pnl?.income)}</b></li>
                  <li className="invrow"><span>Paid out (expenses)</span><b>− {money(pnl?.expense)}</b></li>
                  <li className="invrow"><span><b>Net</b></span><b className={pnl && pnl.profit >= 0 ? "ok" : "err"}>{money(pnl?.profit)}</b></li>
                </ul>
                <div className="ref-glance" style={{ marginTop: ".8rem" }}>
                  {(pnl?.by_method || []).map(m => (
                    <div key={m.method}><small>{m.method.toUpperCase()}</small><b>{money(m.c)}</b></div>
                  ))}
                  {(pnl?.by_category || []).map(c => (
                    <div key={c.category}><small>{c.category.toUpperCase()}</small><b>{money(c.c)}</b></div>
                  ))}
                  {(pnl?.by_method || []).length === 0 && (pnl?.by_category || []).length === 0 &&
                    <p className="empty">No payments or expenses in this window yet.</p>}
                </div>
              </section>
            </div>

            <div className="grid2">
              <section className="panel ref-card">
                <CardHead icon={<Tooth size={17} />} eyebrow="PROCEDURES" title="Top treatments" />
                {topTreatments.length === 0 && <p className="empty">No treatment records yet.</p>}
                <ul className="list">
                  {topTreatments.map(t => (
                    <li key={t.name}>
                      <span className="apptbody">
                        <b>{t.name}</b>
                        <span className="ref-status-track" style={{ width: 110 }}>
                          <i style={{ width: `${Math.round((t.c / Math.max(1, topTreatments[0].c)) * 100)}%`, background: "var(--mint)" }} />
                        </span>
                      </span>
                      <span className="muted">{t.c}× · {money(t.v)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="panel ref-card">
                <CardHead icon={<Stethoscope size={17} />} eyebrow="TEAM" title="Chair utilisation" />
                {util.length === 0 && <p className="empty">Nothing booked in this window yet.</p>}
                <ul className="list">
                  {util.map(u => (
                    <li key={u.dentist}>
                      <span className="apptbody"><b>{u.dentist}</b></span>
                      <span className="muted">{u.completed}/{u.booked} completed · no-show {u.no_show_rate}%</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}

        {/* ---------- v1.3: recall ---------- */}
        {section === "recall" && (
          <section className="panel ref-card">
            <CardHead icon={<Phone size={17} />} eyebrow="FOLLOW-UP" title="Patients due for a check-up"
              right={<span className="rowgap" style={{ marginTop: 0 }}>
                <button className="mini" onClick={() => downloadCSV(`dentera-recall-${todayStamp()}.csv`,
                  ["ID", "Name", "Phone", "Last visit", "Visits"], recall.map(p => [p.id, p.name, p.phone, p.due, p.visits]))}>Export CSV</button>
                <span>{recall.length} due</span></span>} />
            {recall.length === 0 && <p className="empty">Everyone has visited in the last 6 months — no recalls due.</p>}
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Visits</th><th>Last completed visit</th></tr></thead>
                <tbody>
                  {recall.map(p => (
                    <tr key={p.id}>
                      <td className="muted">{p.id}</td>
                      <td><a href={`#/patients/${p.id}`}><b>{p.name}</b></a></td>
                      <td>{p.phone || "—"}</td>
                      <td>{p.visits}</td>
                      <td>{p.due === "never-seen" ? <span className="warnpill pill"><AlertTriangle size={11} /> never seen</span> : p.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------- v1.3: expenses ---------- */}
        {section === "expenses" && (
          <>
            <div className="stats ref-stats ref-stats--2">
              <Stat icon={<TrendingUp size={20} />} iconClass="stat-icon--green" color="mint"
                label="MONEY IN (30D)" value={money(pnl?.income)} foot="recorded payments" />
              <Stat icon={<Wallet size={20} />} iconClass="stat-icon--amber" color="amber"
                label="MONEY OUT (30D)" value={money(pnl?.expense)} foot="logged expenses" />
            </div>
            <section className="panel ref-card">
              <CardHead icon={<TrendingUp size={17} />} eyebrow="NET" title={`Profit — ${pnl ? money(pnl.profit) : "—"}`}
                right={<span className="rowgap" style={{ marginTop: 0 }}>
                  <button className="mini" onClick={() => downloadCSV(`dentera-expenses-${todayStamp()}.csv`,
                    ["ID", "Date", "Category", "Description", "Amount", "By"],
                    expenses.map(e => [e.id, e.spent_at, e.category, e.description, e.amount, e.created_by_name || ""]))}>Export CSV</button>
                </span>} />
              <form className="rowForm dash-form" onSubmit={addExpense} aria-label="Log an expense" style={{ marginBottom: "1rem" }}>
                <div className="grid3">
                  <label>Category
                    <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                      {["rent", "salary", "lab", "material", "utility", "marketing", "equipment", "other"].map(c =>
                        <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>Description <input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} placeholder="e.g. lab bill — crowns" required /></label>
                  <label>Amount (₹) <input type="number" min="1" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} required /></label>
                  <label>Spent on <input type="date" value={expForm.spent_at} onChange={e => setExpForm({ ...expForm, spent_at: e.target.value })} /></label>
                </div>
                <button type="submit" className="dash-cta-btn"><Plus size={15} /> Log expense</button>
              </form>
              <ul className="list">
                {expenses.map(e => (
                  <li key={e.id} className="invrow">
                    <span><b>{money(e.amount)}</b> — {e.description}
                      <span className="muted"> · {e.category} · {e.spent_at}{e.created_by_name ? ` · ${e.created_by_name}` : ""}</span></span>
                  </li>
                ))}
                {expenses.length === 0 && <p className="empty">No expenses logged yet.</p>}
              </ul>
            </section>
          </>
        )}

        {/* ---------- v1.3: inventory ---------- */}
        {section === "inventory" && (
          <>
            {(items.filter(i => i.low).length > 0) && (
              <div className="panel ref-card lowstock" role="status">
                <CardHead icon={<AlertTriangle size={17} />} eyebrow="RESTOCK" title="Low stock" right={`${items.filter(i => i.low).length} item(s)`} />
                <ul className="list">
                  {items.filter(i => i.low).map(i => (
                    <li key={i.id} className="invrow">
                      <span><b>{i.name}</b> — {i.stock_qty} {i.unit} left (minimum {i.min_qty})</span>
                      <button className="mini mini--ok" onClick={() => moveStock(i.id, i.min_qty * 2)}>Restock +{i.min_qty * 2}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <section className="panel ref-card">
              <CardHead icon={<Box size={17} />} eyebrow="STORE" title="Inventory" right={`${items.length} item(s)`} />
              <form className="rowForm dash-form" onSubmit={addItem} aria-label="Add a store item" style={{ marginBottom: "1rem" }}>
                <div className="grid3">
                  <label>Item <input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Composite resin" required /></label>
                  <label>Unit <input value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} /></label>
                  <label>Stock <input type="number" min="0" value={itemForm.stock_qty} onChange={e => setItemForm({ ...itemForm, stock_qty: e.target.value })} /></label>
                  <label>Minimum <input type="number" min="0" value={itemForm.min_qty} onChange={e => setItemForm({ ...itemForm, min_qty: e.target.value })} /></label>
                  <label>Unit cost (₹) <input type="number" min="0" value={itemForm.unit_cost} onChange={e => setItemForm({ ...itemForm, unit_cost: e.target.value })} /></label>
                </div>
                <button type="submit" className="dash-cta-btn"><Plus size={15} /> Add item</button>
              </form>
              <ul className="list">
                {items.map(i => (
                  <li key={i.id} className="invrow">
                    <span>
                      <b>{i.name}</b>
                      <span className="muted"> · {i.stock_qty} {i.unit} · min {i.min_qty} · {money(i.unit_cost)}/{i.unit}</span>
                      {i.low ? <span className="warnpill pill"><AlertTriangle size={11} /> low</span> : null}
                    </span>
                    <span className="rowgap">
                      <button className="mini mini--ok" onClick={() => moveStock(i.id, 1)}>+1</button>
                      <button className="mini" onClick={() => moveStock(i.id, -1)}>−1</button>
                      <button className="mini" onClick={() => showMoves(i.id)}>history</button>
                    </span>
                  </li>
                ))}
                {items.length === 0 && <p className="empty">The store is empty — add consumables above.</p>}
              </ul>
              {moves && (
                <div className="toothpanel">
                  <h4>Stock movements — item #{moves.item_id}</h4>
                  <ul className="list">
                    {moves.rows.map(m => (
                      <li key={m.id}>
                        <b>{m.delta > 0 ? `+${m.delta}` : m.delta}</b>
                        <span className="muted"> · {m.reason || "—"} · {m.user_name || "system"} · {(m.created_at || "").replace("T", " ").slice(0, 16)}</span>
                      </li>
                    ))}
                    {moves.rows.length === 0 && <p className="empty">No movements yet.</p>}
                  </ul>
                  <button className="mini" onClick={() => setMoves(null)}>Close</button>
                </div>
              )}
            </section>
          </>
        )}

        {/* ---------- v1.3: reminders ---------- */}
        {section === "reminders" && (
          <section className="panel ref-card">
            <CardHead icon={<Bell size={17} />} eyebrow="PATIENTS" title="Reminders"
              right={<span className="rowgap" style={{ marginTop: 0 }}>
                <button className="mini primary ask-era" onClick={runReminders} disabled={busy}>
                  <Bell size={13} /> {busy ? "Sending…" : "Plan + send due"}
                </button>
                <span>{reminders.filter(r => r.status === "pending").length} pending</span></span>} />
            <p className="muted" style={{ marginTop: 0 }}>
              Provider: <b>{reminders[0]?.provider || "console"}</b>. No SMS gateway configured — messages are logged on the server and marked sent,
              so the workflow is honest end-to-end. Set REMINDER_WEBHOOK_URL to POST to your own relay.
            </p>
            <form className="rowForm dash-form" onSubmit={createReminder} aria-label="Queue a custom reminder" style={{ marginBottom: "1rem" }}>
              <div className="grid3">
                <label>Patient <input value={remForm.patient_name} onChange={e => setRemForm({ ...remForm, patient_name: e.target.value })} placeholder="Ravi Kumar" /></label>
                <label>Phone / email <input value={remForm.phone} onChange={e => setRemForm({ ...remForm, phone: e.target.value })} /></label>
                <label>Channel
                  <select value={remForm.channel} onChange={e => setRemForm({ ...remForm, channel: e.target.value })}>
                    <option value="sms">SMS</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
                <label className="wide">Message <input value={remForm.message} onChange={e => setRemForm({ ...remForm, message: e.target.value })} placeholder="e.g. Your crown is ready for fitting." required /></label>
                <label>Send on <input type="date" value={remForm.send_at} onChange={e => setRemForm({ ...remForm, send_at: e.target.value })} /></label>
              </div>
              <button type="submit" className="dash-cta-btn"><Plus size={15} /> Queue reminder</button>
            </form>
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>Send at</th><th>Patient</th><th>Channel</th><th>Kind</th><th>Message</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {reminders.map(r => (
                    <tr key={r.id}>
                      <td className="muted">{(r.send_at || "").replace("T", " ").slice(0, 16)}</td>
                      <td>{r.patient_name || "—"}</td>
                      <td className="muted">{r.channel}</td>
                      <td className="muted">{r.kind}</td>
                      <td className="muted" style={{ maxWidth: 260 }}>{r.message}</td>
                      <td><span className={"stchip " + (r.status === "sent" ? "st-completed" : r.status === "failed" ? "st-cancelled" : "st-scheduled")}>{r.status}</span></td>
                      <td>
                        {(r.status === "pending" || r.status === "failed") &&
                          <button className="mini" onClick={() => skipReminder(r.id, "skipped")}>skip</button>}
                        {r.status === "skipped" && <button className="mini" onClick={() => skipReminder(r.id, "pending")}>re-open</button>}
                      </td>
                    </tr>
                  ))}
                  {reminders.length === 0 && <tr><td colSpan="7" className="empty">No reminders yet — plan them from today's appointments with one click.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------- v1.3: staff ---------- */}
        {section === "staff" && (
          <section className="panel ref-card">
            <CardHead icon={<UserRound size={17} />} eyebrow="TEAM" title="Staff accounts" right={`${staff.length} reception`} />
            <p className="muted" style={{ marginTop: 0 }}>Reception can run the front desk: appointments, public bookings, invoices and receipts. Charts and treatment plans stay dentist-only.</p>
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>Name</th><th>Email (sign-in)</th><th>Since</th><th /></tr></thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td className="muted">{s.id}</td>
                      <td><b>{s.name}</b></td>
                      <td>{s.email}</td>
                      <td className="muted">{(s.created_at || "").slice(0, 10)}</td>
                      <td>{isAdmin && <button className="mini mini--danger" onClick={() => removeStaff(s.id)}><XMark size={13} /> remove</button>}</td>
                    </tr>
                  ))}
                  {staff.length === 0 && <tr><td colSpan="5" className="empty">No reception accounts yet.</td></tr>}
                </tbody>
              </table>
            </div>
            {isAdmin && (
              <form className="dash-book" style={{ marginTop: "1.2rem" }} onSubmit={addStaff} aria-label="Add a staff account">
                <div className="dash-book__banner">
                  <span className="dash-book__banner-icon" aria-hidden="true"><UserRound size={26} /></span>
                  <div><h3>Add a reception account</h3><p>They sign in immediately with the email + temporary password.</p></div>
                </div>
                <div className="rowForm">
                  <div className="grid3">
                    <label>Name <input value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Reena Receptionist" required /></label>
                    <label>Email (sign-in) <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="reena@dental.local" required /></label>
                    <label>Temporary password <input value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="at least 6 characters" minLength={6} required /></label>
                  </div>
                  <button type="submit" className="dash-cta-btn"><Check size={15} /> Add staff</button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* ---------- v1.3: backups ---------- */}
        {section === "backups" && (
          <section className="panel ref-card">
            <CardHead icon={<Database size={17} />} eyebrow="DATA" title="Database backups"
              right={<span className="rowgap" style={{ marginTop: 0 }}>
                <button className="mini primary ask-era" onClick={createBackup} disabled={busy}>
                  <Database size={13} /> {busy ? "Saving…" : "Backup now"}
                </button>
                <span>newest {backups.length} kept</span></span>} />
            <p className="muted" style={{ marginTop: 0 }}>
              A snapshot is taken automatically every 24 hours. These are full database copies — keep them off this machine for real safety.
              Until then, treat the demo store as disposable.
            </p>
            <ul className="list">
              {backups.map(b => (
                <li key={b.name} className="invrow">
                  <span><b>{b.name}</b><span className="muted"> · {(b.bytes / 1024).toFixed(0)} KB · {(b.created_at || "").replace("T", " ").slice(0, 16)}</span></span>
                </li>
              ))}
              {backups.length === 0 && <p className="empty">No backups yet — create the first one now.</p>}
            </ul>
          </section>
        )}

        {section === "settings" && (
          <section className="panel ref-card" style={{ maxWidth: 560 }}>
            <CardHead icon={<ShieldCheck size={17} />} eyebrow="ACCOUNT" title="Change your password" right={me.role} />
            <p className="muted" style={{ marginTop: 0 }}>
              Signed in as <b>{me.name}</b> (username <b>{me.email === "admin" || me.role === "admin" ? "admin" : me.email || "—"}</b>).
              The new password is used the next time you sign in.
            </p>
            <form className="rowForm" onSubmit={changePassword} aria-label="Change password">
              <div className="grid3" style={{ gridTemplateColumns: "1fr" }}>
                <label>Current password<input type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></label>
                <label>New password (min 6 characters)<input type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={6} required /></label>
                <label>Confirm new password<input type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" minLength={6} required /></label>
              </div>
              <button type="submit" className="dash-cta-btn"><Check size={15} /> Update password</button>
            </form>
          </section>
        )}

        {section === "audit" && (
          <section className="panel ref-card">
            <CardHead icon={<Shield size={17} />} eyebrow="SECURITY" title="Assistant & access trail"
              right={<span className="rowgap" style={{ marginTop: 0 }}><button className="mini" onClick={exportAudit}>Export CSV</button><span>last 40 events</span></span>} />
            <div className="tablewrap">
              <table className="tbl">
                <thead><tr><th>When</th><th>User</th><th>Action</th><th>Tool</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>
                  {auditRows.map(r => (
                    <tr key={r.id}>
                      <td className="muted">{(r.created_at || "").replace("T", " ").slice(0, 16)}</td>
                      <td>{r.user || "—"}</td>
                      <td>{r.action}</td>
                      <td className="muted">{r.tool_name || "—"}</td>
                      <td><span className={"stchip " + (r.success ? "st-scheduled" : "st-cancelled")}>{r.success ? "ok" : "failed"}</span></td>
                      <td className="muted">{r.detail || ""}</td>
                    </tr>
                  ))}
                  {auditRows.length === 0 && <tr><td colSpan="6" className="empty">No events yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
