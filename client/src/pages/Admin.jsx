import React, { useEffect, useState } from "react"
import { api } from "../api.js"
import DentEraMark from "../components/DentEraMark.jsx"
import {
  Home, LayoutGrid, Calendar, Users, Wallet, Shield, ClipboardList, Globe,
  Stethoscope, Tooth, RotateCcw, AlertTriangle, LogOut, CalendarCheck, PieChart,
  ShieldCheck, UserRound, Check, BarChart,
} from "../components/Icons.jsx"
import StatusDonut, { STATUS_ORDER, STATUS_META } from "../components/StatusDonut.jsx"
import InstallButton from "../components/InstallButton.jsx"
import { downloadCSV, todayStamp } from "../utils/csv.js"
import { printReceipt } from "../utils/receipt.js"
import "../dashboard.css"

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
  ["billing", "Billing", Wallet],
  ["doctors", "Doctors", Stethoscope],
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
  billing: { eyebrow: "CLINIC-WIDE", title: "Billing",
    desc: "Invoices for the whole clinic — mark payments and print receipts as they come in." },
  doctors: { eyebrow: "TEAM", title: "Doctors",
    desc: "The clinic's dentists — add a new doctor and they can sign in right away." },
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

  async function loadInvoices() {
    const { data } = await api.get("/api/invoices")
    setInvoices(data.data || [])
  }
  async function loadDoctors() {
    const { data } = await api.get("/api/admin/dentists")
    setDoctors(data.data || [])
  }
  useEffect(() => {
    ;(async () => {
      const [o, a, p, au] = await Promise.all([
        api.get("/api/admin/overview"), api.get("/api/admin/appointments?days=7"),
        api.get("/api/admin/patients"), api.get("/api/admin/audit")])
      setOv(o.data.data || null); setAppts(a.data.data || [])
      setPatients(p.data.data || []); setAuditRows(au.data.data || [])
      await Promise.all([loadInvoices(), loadDoctors()])
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
          <a className="mini" href="#/dashboard"><Stethoscope size={14} /> Doctor dashboard</a>
          <a className="mini" href="#/book"><Globe size={14} /> Public booking</a>
          <button className="mini" onClick={() => window.location.reload()}><RotateCcw size={14} /> Refresh</button>
          <InstallButton className="mini" label="Install app" />
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
