import React, { useEffect, useState } from "react"
import { api } from "../api.js"
import DentEraMark from "../components/DentEraMark.jsx"
import {
  Home, LayoutGrid, Calendar, Users, Wallet, Shield, ClipboardList, Globe,
  Stethoscope, Tooth, RotateCcw, AlertTriangle, LogOut, CalendarCheck, PieChart,
} from "../components/Icons.jsx"
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

const NAV = [
  ["overview", "Overview", Home],
  ["appointments", "Appointments", LayoutGrid],
  ["patients", "Patients", Users],
  ["billing", "Billing", Wallet],
  ["audit", "Audit trail", Shield],
]

const SECTION_COPY = {
  overview: { eyebrow: "ADMIN CONSOLE · CLINIC-WIDE", title: "Clinic overview",
    desc: "Everything happening across the practice — appointments, patients, revenue and Era's activity trail." },
  appointments: { eyebrow: "CLINIC-WIDE", title: "Appointments",
    desc: "Every dentist's bookings for the next 7 days — public bookings and doctor-made alike." },
  patients: { eyebrow: "CLINIC-WIDE", title: "Patients",
    desc: "The full clinic register across every dentist." },
  billing: { eyebrow: "CLINIC-WIDE", title: "Billing",
    desc: "Invoices for the whole clinic — mark payments as they come in." },
  audit: { eyebrow: "SECURITY", title: "Audit trail",
    desc: "The last 40 assistant and access events across the clinic." },
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
  const [msg, setMsg] = useState("")
  const [busyOut, setBusyOut] = useState(false)

  async function loadInvoices() {
    const { data } = await api.get("/api/invoices")
    setInvoices(data.data || [])
  }
  useEffect(() => {
    ;(async () => {
      const [o, a, p, au] = await Promise.all([
        api.get("/api/admin/overview"), api.get("/api/admin/appointments?days=7"),
        api.get("/api/admin/patients"), api.get("/api/admin/audit")])
      setOv(o.data.data || null); setAppts(a.data.data || [])
      setPatients(p.data.data || []); setAuditRows(au.data.data || [])
      await loadInvoices()
    })()
  }, [])

  async function pay(invId, full) {
    const inv = invoices.find(i => i.id === invId)
    const amount = full ? (inv.amount - inv.discount) : Math.round((inv.amount - inv.discount) / 2)
    const { data } = await api.patch(`/api/invoices/${invId}`, { paid_amount: amount })
    setMsg(data.data ? `Invoice #${invId} → ${data.data.status}.` : (data.message || "Failed."))
    await loadInvoices()
  }

  async function logout() {
    setBusyOut(true)
    try { await api.post("/api/auth/logout") } catch { /* cookie may already be gone */ }
    if (onLogout) onLogout()
    location.hash = "#/"
  }

  const copy = SECTION_COPY[section]
  const dentistName = a => a.dentist || "—"

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
          <div className="stats ref-stats">
            <Stat icon={<CalendarCheck size={20} />} iconClass="stat-icon--sky" color="sky"
              label="APPOINTMENTS TODAY" value={ov.appts_today} foot={prettyToday()} />
            <Stat icon={<Calendar size={20} />} iconClass="stat-icon--green" color="mint"
              label="NEXT 7 DAYS" value={ov.appts_week} foot="across all dentists" />
            <Stat icon={<Users size={20} />} iconClass="stat-icon--teal" color="teal"
              label="PATIENTS" value={ov.patients} foot="in the clinic register" />
            <Stat icon={<Wallet size={20} />} iconClass="stat-icon--sky" color="sky"
              label="UNPAID REVENUE" value={money(ov.unpaid_due)} foot="awaiting collection" />
          </div>
          <div className="stats ref-stats">
            <Stat icon={<ClipboardList size={20} />} iconClass="stat-icon--green" color="mint"
              label="ACTIVE PLANS" value={ov.plans_active} foot="treatment plans in progress" />
            <Stat icon={<Globe size={20} />} iconClass="stat-icon--teal" color="teal"
              label="PUBLIC BOOKINGS" value={ov.public_bookings} foot="self-booked online" />
            <Stat icon={<Stethoscope size={20} />} iconClass="stat-icon--sky" color="sky"
              label="DENTISTS / USERS" value={`${ov.dentists}/${ov.users}`} foot="registered accounts" />
            <Stat icon={<Tooth size={20} />} iconClass="stat-icon--green" color="mint"
              label="TREATMENTS" value={ov.treatments} foot="in the catalogue" />
          </div>

          <section className="panel ref-card">
            <CardHead icon={<PieChart size={17} />} eyebrow="LIVE" title="Recent activity" right="latest 10 events" />
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
            <CardHead icon={<Calendar size={17} />} eyebrow="UPCOMING" title="Appointments — next 7 days" right={`${appts.length} booked`} />
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
            <CardHead icon={<Users size={17} />} eyebrow="REGISTER" title="Patients — all dentists" right={`${patients.length} on file`} />
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
            <CardHead icon={<Wallet size={17} />} eyebrow="REVENUE" title="Invoices — whole clinic" right={`${invoices.length} invoices`} />
            <ul className="list">
              {invoices.map(i => (
                <li key={i.id} className="invrow">
                  <span><b>#{i.id}</b> {money(i.amount)}{i.discount ? ` − ${money(i.discount)}` : ""} · paid {money(i.paid_amount)}</span>
                  <span className="rowgap">
                    <span className={"stchip st-" + i.status}>{i.status}</span>
                    {i.status !== "paid" && <button className="mini" onClick={() => pay(i.id, true)}>mark fully paid</button>}
                    {i.status === "unpaid" && <button className="mini" onClick={() => pay(i.id, false)}>half payment</button>}
                  </span>
                </li>
              ))}
              {invoices.length === 0 && <p className="empty">No invoices on file.</p>}
            </ul>
          </section>
        )}

        {section === "audit" && (
          <section className="panel ref-card">
            <CardHead icon={<Shield size={17} />} eyebrow="SECURITY" title="Assistant & access trail" right="last 40 events" />
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
