import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import DentEraMark from '../components/DentEraMark.jsx'
import Notifications from '../components/Notifications.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import TrendChart from '../components/TrendChart.jsx'
import {
  Home, LayoutGrid, UserRound, IndianRupee, Plus, Check, XMark, RotateCcw, Clock,
  Search, MessageCircle, Shield, AlertTriangle, ChevronRight, CalendarCheck, Users,
  ClipboardList, Stethoscope, LogOut, Menu, Calendar, BarChart, Phone, Globe, Tooth,
} from '../components/Icons.jsx'
import '../dashboard.css'
import '../dashboard-v13.css'

const pad = n => String(n).padStart(2, '0')
const fmt12 = t => { const [h, m] = (t || '').split(':').map(Number); if (Number.isNaN(h)) return t || ''
  const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}` }
const addMin = (t, m) => { const [h, mm] = String(t || '09:00').split(':').map(Number)
  const tot = (h * 60 + mm) + (+m || 30); return `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}` }
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => isoOf(new Date())
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoOf(d) }
const dayAfter = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d) }
const prettyDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) }
const shortDay = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'short' }) }
const dayNum = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return ''
  return new Date(+m[1], +m[2] - 1, +m[3]).getDate() }
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const initial = n => (n || '?').replace(/^Dr\.?\s*/i, '').trim()[0]?.toUpperCase() || '?'
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const doctorPhoto = id => `/doctor-${((((id || 1) - 1) % 8) + 8) % 8 + 1}.jpg`

const STATUS_ORDER = ['scheduled', 'completed', 'no_show', 'cancelled']
const STATUS_META = {
  scheduled: { label: 'Scheduled', color: '#0ea5e9' },
  completed: { label: 'Completed', color: '#22c55e' },
  no_show: { label: 'No-show', color: '#f59e0b' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
}

/* Patient initials avatar */
function PatAvatar({ name, big }) {
  return <span className={big ? 'ref-next-avatar' : 'ref-row-avatar'} aria-hidden="true">{initial(name)}</span>
}

export default function Dashboard({ me, onChat, onLogout }) {
  const [appts, setAppts] = useState([])
  const [patients, setPatients] = useState([])
  const [patientTotal, setPatientTotal] = useState(0)
  const [invoices, setInvoices] = useState([])
  const [q, setQ] = useState('')
  const [date, setDate] = useState(today())
  const [msg, setMsg] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [sideOpen, setSideOpen] = useState(false) // mobile: off-canvas sidebar drawer

  // v1.3 state: week view, insights, recall, payments
  const [weekAppts, setWeekAppts] = useState([])
  const [weekFrom, setWeekFrom] = useState(today())
  const [dragId, setDragId] = useState(null)
  const [insights, setInsights] = useState(null)
  const [trend, setTrend] = useState([])
  const [topTreatments, setTopTreatments] = useState([])
  const [util, setUtil] = useState([])
  const [recall, setRecall] = useState([])
  const [payFor, setPayFor] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'upi', reference: '' })
  const [upi, setUpi] = useState(null)

  // booking studio state
  const [bookOpen, setBookOpen] = useState(false)
  const [book, setBook] = useState({ patient_id: '', fname: '', lname: '', phone: '', email: '', address: '', date: today(), time: '10:00', minutes: 30, reason: 'Consultation' })
  const [bookErr, setBookErr] = useState('')
  const [bookBusy, setBookBusy] = useState(false)
  const [slots, setSlots] = useState(null)
  const [treatments, setTreatments] = useState([])
  const slotsSeq = useRef(0)

  const [addOpen, setAddOpen] = useState(false)
  const [addPatient, setAddPatient] = useState({ name: '', phone: '', dob: '', gender: '', medical_notes: '' })

  const isDentist = me.role === 'dentist'

  async function load() {
    const safe = p => p.catch(() => ({ data: { data: [] } }))
    const [a, p, pt, i] = await Promise.all([
      safe(api.get(`/api/appointments?date=${date}`)), safe(api.get(`/api/patients?q=${encodeURIComponent(q)}`)),
      safe(api.get('/api/patients?q=')), safe(api.get('/api/invoices?status=unpaid'))])
    setAppts(a.data.data || []); setPatients(p.data.data || [])
    setPatientTotal((pt.data.data || []).length); setInvoices(i.data.data || [])
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [date, q]) // eslint-disable-line react-hooks/exhaustive-deps

  // treatment catalogue powers the reason quick-picks (duration auto-syncs per treatment)
  useEffect(() => {
    if (!isDentist) return
    let live = true
    api.get('/api/treatments').then(({ data }) => { if (live) setTreatments(data.data || []) }).catch(() => {})
    return () => { live = false }
  }, [isDentist])

  // v1.3: week appointments (7 days from weekFrom)
  useEffect(() => {
    if (activeSection !== 'week') return
    let live = true
    api.get(`/api/appointments?from=${weekFrom}&to=${dayAfter(6)}`).then(({ data }) => {
      if (live) setWeekAppts(data.data || [])
    }).catch(() => {})
    return () => { live = false }
  }, [activeSection, weekFrom])

  // v1.3: practice insights
  useEffect(() => {
    if (activeSection !== 'insights') return
    let live = true
    Promise.all([
      api.get('/api/analytics/summary'), api.get('/api/analytics/trend'),
      api.get('/api/analytics/top-treatments'), api.get('/api/analytics/utilization')])
      .then(([s, t, tt, u]) => {
        if (!live) return
        setInsights(s.data.data || null); setTrend(t.data.data || [])
        setTopTreatments(tt.data.data || []); setUtil(u.data.data || [])
      }).catch(() => {})
    return () => { live = false }
  }, [activeSection])

  // v1.3: recall list
  useEffect(() => {
    if (activeSection !== 'recall') return
    let live = true
    api.get('/api/recall').then(({ data }) => { if (live) setRecall(data.data || []) }).catch(() => {})
    return () => { live = false }
  }, [activeSection])

  // free slots for the booking form — fetched live while the form is open (race-guarded)
  useEffect(() => {
    if (!bookOpen || !isDentist) return
    const seq = ++slotsSeq.current
    let live = true
    setSlots(undefined)
    api.get(`/api/slots?date=${book.date}`).then(({ status, data }) => {
      if (live && seq === slotsSeq.current) setSlots(status === 200 ? (data.data || []) : null)
    }).catch(() => { if (live && seq === slotsSeq.current) setSlots(null) })
    return () => { live = false }
  }, [bookOpen, book.date, isDentist])

  async function logout() { await api.post('/api/auth/logout'); onLogout(); location.hash = '#/' }

  const due = invoices.reduce((s, i) => s + (i.amount - i.discount - i.paid_amount), 0)
  const doneToday = appts.filter(a => a.status === 'completed').length

  const statusCounts = { scheduled: 0, completed: 0, no_show: 0, cancelled: 0 }
  appts.forEach(a => { if (statusCounts[a.status] != null) statusCounts[a.status]++ })
  const statusTotal = STATUS_ORDER.reduce((s, k) => s + statusCounts[k], 0)
  const nextAppt = appts.filter(a => a.status === 'scheduled')
    .sort((x, y) => String(x.start_time || '').localeCompare(String(y.start_time || '')))[0] || null

  const pageCopy = {
    overview: { eyebrow: 'OVERVIEW', title: 'Dashboard', description: prettyDate(date) },
    appointments: { eyebrow: 'SCHEDULE', title: 'Appointments', description: 'Appointments booked for the selected day.' },
    patients: { eyebrow: 'CLINIC', title: 'Patient register', description: 'Registered patients and their contact details.' },
    billing: { eyebrow: 'BILLING', title: 'Unpaid invoices', description: 'Outstanding payments to follow up.' },
    week: { eyebrow: 'PLANNING', title: 'Week view', description: 'Drag a visit to another day to move it — overlaps are refused automatically.' },
    insights: { eyebrow: 'PRACTICE', title: 'Practice insights', description: 'Revenue, treatments and chair utilisation for your practice.' },
    recall: { eyebrow: 'FOLLOW-UP', title: 'Recall list', description: 'Patients due for a check-up — last completed visit older than 6 months, or never seen.' }
  }[activeSection]

  function toggleBook() {
    if (bookOpen) return setBookOpen(false)
    setBookErr(''); setBook(b => ({ ...b, date })); setBookOpen(true)
  }
  function toggleAdd() {
    if (addOpen) return setAddOpen(false)
    setMsg(''); setAddOpen(true)
  }

  async function bookAppt(e) {
    e.preventDefault(); setBookErr('')
    const phone = (book.phone || '').trim()
    const email = (book.email || '').trim()
    const address = (book.address || '').trim()
    const reason = book.reason.trim() || 'Consultation'
    const end_time = addMin(book.time, +book.minutes)
    let pid = null, name
    if (book.patient_id) {
      pid = +book.patient_id
      name = (patients.find(p => p.id === pid) || {}).name || 'the patient'
    } else {
      name = [book.fname.trim(), book.lname.trim()].filter(Boolean).join(' ')
      if (name.length < 2) { setBookErr('Please enter the patient name.'); return }
      if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) { setBookErr('Please enter a valid mobile number (7–15 digits).'); return }
    }
    setBookBusy(true)
    try {
      // with a mobile number: register (or reuse) the patient record, then link the visit to it
      if (!pid && phone) {
        const pr = await api.post('/api/patients', { name, phone })
        if (pr.status === 201 || pr.status === 200) pid = (pr.data.data || {}).id || null
        else { setBookErr(pr.data.message || 'Could not save the patient record.'); return }
      }
      const body = pid
        ? { patient_id: pid, date: book.date, start_time: book.time, end_time, reason, email, address }
        : { patient_name: name, date: book.date, start_time: book.time, end_time, reason, email, address }
      const { status, data } = await api.post('/api/appointments', body)
      if (status === 201) {
        setMsg(`Booked ${name} at ${fmt12(book.time)} on ${prettyDate(book.date)}${pid ? ` — patient #${pid} linked.` : ' — walk-in saved.'}`)
        setBookOpen(false)
        setBook(b => ({ ...b, fname: '', lname: '', phone: '', email: '', address: '' }))
        load()
      } else setBookErr(data.message || 'Could not book — please try another time.')
    } finally { setBookBusy(false) }
  }

  async function setStatus(id, status) {
    setMsg('')
    const { status: code, data } = await api.patch(`/api/appointments/${id}`, { status })
    setMsg(code === 200 ? `Marked ${status.replace('_', ' ')}.` : (data.message || 'Failed.'))
    load()
  }

  async function cancelAppt(id) {
    setMsg('')
    const { data } = await api.del(`/api/appointments/${id}`)
    setMsg(data.ok ? 'Appointment cancelled.' : (data.message || 'Failed.'))
    load()
  }

  // v1.3: drag a visit to another day (time stays; the server re-checks overlaps)
  async function moveToDay(id, toDate) {
    setMsg('')
    const ap = weekAppts.find(a => a.id === id)
    if (!ap || ap.appointment_date === toDate) return
    const { status, data } = await api.patch(`/api/appointments/${id}`, { appointment_date: toDate })
    setMsg(status === 200 ? `Moved ${ap.patient_name || 'the visit'} to ${prettyDate(toDate)}.` : (data.message || 'Could not move that visit.'))
    if (status === 200) {
      const updated = await api.get(`/api/appointments?from=${weekFrom}&to=${dayAfter(6)}`)
      setWeekAppts(updated.data.data || [])
    }
  }

  async function addNewPatient(e) {
    e.preventDefault(); setMsg('')
    const b = addPatient
    const { status, data } = await api.post('/api/patients', {
      name: b.name, phone: b.phone, dob: b.dob || null, gender: b.gender || null, medical_notes: b.medical_notes })
    if (status === 201 || status === 200) {
      setMsg(data.existing ? `Phone already on file — opened patient #${data.data.id}.` : `Patient added (#${data.data.id}).`)
      setAddOpen(false); setAddPatient({ name: '', phone: '', dob: '', gender: '', medical_notes: '' })
      q === '' ? load() : setQ('')
      if (data.existing) location.hash = `#/patients/${data.data.id}`
    } else setMsg(data.message || 'Could not add the patient.')
  }

  async function pay(invId, full) {
    const inv = invoices.find(i => i.id === invId)
    const total = inv.amount - inv.discount
    const left = total - (inv.paid_amount || 0)
    // markInvoicePaid takes an ABSOLUTE paid_amount — fully paid = the whole total
    const amount = full ? total : (inv.paid_amount || 0) + Math.round(left / 2)
    const { data } = await api.patch(`/api/invoices/${invId}`, { paid_amount: amount })
    setMsg(data.data ? `Invoice #${invId} → ${data.data.status}.` : (data.message || 'Failed.'))
    load()
  }

  // v1.3: record a real payment (method + reference on the payment row)
  async function recordPayment(e) {
    e.preventDefault(); setMsg('')
    const { status, data } = await api.post(`/api/invoices/${payFor}/payments`, {
      amount: Math.round(+payForm.amount), method: payForm.method, reference: payForm.reference || undefined })
    if (status === 201) {
      setMsg(`Recorded ${money(data.data.amount)} (${data.data.method}) — invoice #${data.data.invoice_id} is now ${data.data.status}.`)
      setPayFor(null); setPayForm({ amount: '', method: 'upi', reference: '' }); load()
    } else setMsg(data.message || 'Could not record the payment.')
  }

  // v1.3: UPI deep link for an outstanding invoice
  async function showUpi(invId) {
    setMsg('')
    const { status, data } = await api.get(`/api/invoices/${invId}/upi`)
    if (status === 200) { setUpi(data.data); setMsg(`UPI link ready for ${money(data.data.amount)} — copy it or open a UPI app.`) }
    else setMsg(data.message || 'Could not build the UPI link.')
  }

  const walkInMode = !book.patient_id
  const weekDays = Array.from({ length: 7 }, (_, i) => dayAfter(i))

  return (
    <div className="view dashboard-page">
      <aside className={'dashboard-sidebar' + (sideOpen ? ' is-open' : '')} aria-label="Clinic navigation">
        <a className="brand dashboard-brand" href="#/" aria-label="DentEra home">
          <span className="brand-mark"><DentEraMark /></span>
          <span>DentEra<small>CLINIC WORKSPACE</small></span>
        </a>

        <div className="ref-profile">
          <span className="ref-profile-avatar is-photo">
            <img src={doctorPhoto(me.id)} alt="" />
          </span>
          <b>{me.name}</b>
          <small>{me.role === 'dentist' ? (me.specialty || 'Dentist') : (me.role || 'Staff')}</small>
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard sections">
          {[['overview', 'Overview', Home], ['appointments', 'Appointments', LayoutGrid], ['week', 'Week view', Calendar],
            ['patients', 'Patients', UserRound], ['billing', 'Billing', IndianRupee], ['insights', 'Insights', BarChart],
            ['recall', 'Recall', Phone]].map(([id, label, Icon]) => (
            <button key={id} type="button" className={activeSection === id ? 'is-active' : ''}
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => { setActiveSection(id); setSideOpen(false) }}>
              <span aria-hidden="true"><Icon size={17} /></span>{label}
            </button>
          ))}
        </nav>

        <button type="button" className="ref-signout" onClick={logout}><LogOut size={16} /> Sign out</button>
      </aside>
      {sideOpen && <div className="dash-scrim" onClick={() => setSideOpen(false)} aria-hidden="true" />}

      <main className="dashboard-main" id="overview">
      <div className="topbar dashboard-toolbar">
        <button type="button" className="dash-burger" aria-label="Toggle navigation menu" onClick={() => setSideOpen(o => !o)}><Menu size={20} /></button>
        <h1 className="ref-topbar-title">Dashboard</h1>
        <span className="spacer" />
        <ThemeToggle />
        <Notifications />
        {(me.role === 'admin' || me.role === 'reception') && <a className="mini" href="#/admin" title="Admin panel" aria-label="Admin panel"><Shield size={14} /><span className="hide-sm">Admin panel</span></a>}
        <a className="mini" href="#/book" title="Public booking" aria-label="Public booking"><Globe size={14} /><span className="hide-sm">Public booking</span></a>
        <a className="mini" href="#/portal" title="Patient portal" aria-label="Patient portal"><Tooth size={14} /><span className="hide-sm">Patient portal</span></a>
        {me.role === 'dentist' && <button className="mini primary ask-era" onClick={onChat}><MessageCircle size={14} /> Ask Era</button>}
      </div>

      <div className="pagehead">
        <div>
          <span className="dashboard-eyebrow">{pageCopy.eyebrow}</span>
          <h2 className="ref-pagehead-title">{pageCopy.title}</h2>
          <p className="muted">{pageCopy.description}</p>
        </div>
        {isDentist && <div className="dashboard-actions">
          {(activeSection === 'overview' || activeSection === 'patients') && <button className="btn btn--ghost" onClick={toggleAdd}><Plus size={15} /> Add patient</button>}
          {(activeSection === 'overview' || activeSection === 'appointments') && <button className="btn dash-cta-btn" onClick={toggleBook}><CalendarCheck size={15} /> New appointment</button>}
        </div>}
      </div>

      {msg && <p className="authmsg ok" role="status" aria-live="polite">{msg}</p>}
      {upi && (
        <div className="panel upicard">
          <div><span className="panel-eyebrow">UPI PAYMENT</span><h3>{money(upi.amount)} — invoice #{upi.invoice_id}</h3></div>
          <code className="upilink">{upi.upi}</code>
          <span className="rowgap">
            <button className="mini" onClick={() => navigator.clipboard?.writeText(upi.upi)}>Copy link</button>
            <a className="mini" href={upi.upi}>Open UPI app</a>
            <button className="mini" onClick={() => setUpi(null)}>Close</button>
          </span>
          <p className="muted tiny">Any UPI app can pay this link — record the payment here once the money arrives.</p>
        </div>
      )}

      {activeSection === 'overview' && <>
        <div className="stats ref-stats">
          <div className="stat stat--sky">
            <span className="stat-icon stat-icon--sky" aria-hidden="true"><CalendarCheck size={20} /></span>
            <div className="stat-body">
              <span className="statlabel">{date === today() ? "TODAY'S APPOINTMENTS" : 'APPOINTMENTS'}</span>
              <span className="statnum">{String(appts.length).padStart(2, '0')}</span>
              <span className="stat-foot">{prettyDate(date)}</span>
            </div>
          </div>
          <div className="stat stat--mint">
            <span className="stat-icon stat-icon--green" aria-hidden="true"><Clock size={20} /></span>
            <div className="stat-body">
              <span className="statlabel">{date === today() ? 'COMPLETED TODAY' : 'COMPLETED'}</span>
              <span className="statnum">{String(doneToday).padStart(2, '0')}</span>
              <span className="stat-foot">{appts.length ? `of ${appts.length} booked` : 'nothing booked yet'}</span>
            </div>
          </div>
          <div className="stat stat--teal">
            <span className="stat-icon stat-icon--teal" aria-hidden="true"><Users size={20} /></span>
            <div className="stat-body">
              <span className="statlabel">TOTAL PATIENTS</span>
              <span className="statnum">{patientTotal}+</span>
              <span className="stat-foot">in your register</span>
            </div>
          </div>
          <div className="stat stat--amber">
            <span className="stat-icon stat-icon--amber" aria-hidden="true"><IndianRupee size={20} /></span>
            <div className="stat-body">
              <span className="statlabel">OUTSTANDING</span>
              <span className="statnum">{money(due)}</span>
              <span className="stat-foot">{invoices.length} invoice{invoices.length === 1 ? '' : 's'} to collect</span>
            </div>
          </div>
        </div>

        <div className="ref-grid ref-grid--a">
          <section className="panel ref-card">
            <div className="ref-card-head">
              <div className="ref-card-title">
                <span className="ref-card-icon" aria-hidden="true"><CalendarCheck size={17} /></span>
                <div><span className="panel-eyebrow">UP NEXT</span><h3>Next Appointment</h3></div>
              </div>
              {nextAppt && <span className={'stchip st-' + nextAppt.status}>{nextAppt.status.replace('_', ' ')}</span>}
            </div>
            {nextAppt ? (
              <div className="ref-next">
                <div className="ref-next-head">
                  <PatAvatar name={nextAppt.patient_name} big />
                  <div>
                    <b>{nextAppt.patient_name || 'Walk-in'}</b>
                    <small>{nextAppt.reason || 'Consultation'}{nextAppt.source === 'public' ? ' · public booking' : ''}</small>
                  </div>
                </div>
                <div className="ref-next-meta">
                  <div><small>Time</small><b>{fmt12(nextAppt.start_time)}</b></div>
                  <div><small>Ends</small><b>{fmt12(nextAppt.end_time)}</b></div>
                  <div><small>Day</small><b>{shortDay(nextAppt.appointment_date)} {dayNum(nextAppt.appointment_date)}</b></div>
                </div>
                <p className="ref-next-note">
                  <ClipboardList size={14} /> {nextAppt.reason || 'Consultation'} — overlapping bookings are blocked automatically.
                  {nextAppt.email ? ` · ${nextAppt.email}` : ''}{nextAppt.address ? ` · ${nextAppt.address}` : ''}
                </p>
                <div className="ref-next-actions">
                  <a className="ref-btn ref-btn--line" href={`#/patients/${nextAppt.patient_id || ''}`} style={nextAppt.patient_id ? null : { visibility: 'hidden' }}>Open chart</a>
                  <button type="button" className="ref-btn" onClick={() => setStatus(nextAppt.id, 'completed')}><Check size={14} /> Mark complete</button>
                  <button type="button" className="ref-btn ref-btn--warn" onClick={() => setStatus(nextAppt.id, 'no_show')}>No-show</button>
                </div>
              </div>
            ) : (
              <p className="empty"><CalendarCheck size={22} /> {appts.length ? 'No scheduled visits left today.' : 'No appointments today.'}</p>
            )}
          </section>

          <section className="panel ref-card">
            <div className="ref-card-head">
              <div className="ref-card-title">
                <div><span className="panel-eyebrow">TODAY</span><h3>Status breakdown</h3></div>
              </div>
              <span className="ref-card-date">{statusTotal} appointment{statusTotal === 1 ? '' : 's'}</span>
            </div>
            <div className="ref-statuses">
              {STATUS_ORDER.map(k => {
                const pct = Math.round((statusCounts[k] / (statusTotal || 1)) * 100)
                return (
                  <div key={k} className="ref-status-row">
                    <span className="ref-status-label">{STATUS_META[k].label}</span>
                    <span className="ref-status-track"><i style={{ width: `${statusTotal ? pct : 0}%`, background: STATUS_META[k].color }} /></span>
                    <span className="ref-status-val">{statusCounts[k]}<small> {pct}%</small></span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </>}

      {bookOpen && (activeSection === 'overview' || activeSection === 'appointments') && isDentist && (
        <form className="dash-book" onSubmit={bookAppt} aria-label="Book an appointment">
          <div className="dash-book__banner">
            <span className="dash-book__banner-icon" aria-hidden="true"><CalendarCheck size={26} /></span>
            <div>
              <h3>Book an appointment</h3>
              <p>{prettyDate(book.date)} · pick a free slot — overlaps are refused automatically.</p>
            </div>
          </div>

          <section className="dash-book__sec">
            <div className="dash-book__sec-head"><span className="secnum" aria-hidden="true">1</span><h4>Patient details</h4></div>
            <div className="seg" role="group" aria-label="Patient type">
              <button type="button" className={walkInMode ? 'seg__btn is-on' : 'seg__btn'} aria-pressed={walkInMode} onClick={() => setBook(b => ({ ...b, patient_id: '' }))}>Walk-in</button>
              <button type="button" className={!walkInMode ? 'seg__btn is-on' : 'seg__btn'} aria-pressed={!walkInMode} disabled={!patients.length}
                onClick={() => setBook(b => ({ ...b, patient_id: b.patient_id || (patients[0] ? String(patients[0].id) : '') }))}>Registered{!patients.length ? ' · none' : ''}</button>
            </div>
            {walkInMode ? (
              <div className="dash-fields">
                <label className="dash-field">First name<input value={book.fname} onChange={e => setBook({ ...book, fname: e.target.value })} required autoComplete="given-name" /></label>
                <label className="dash-field">Last name<input value={book.lname} onChange={e => setBook({ ...book, lname: e.target.value })} autoComplete="family-name" /></label>
                <label className="dash-field">Mobile no<input value={book.phone} onChange={e => setBook({ ...book, phone: e.target.value })} type="tel" placeholder="e.g. 9810022223" pattern="[0-9+\-\s]{7,15}" autoComplete="tel" /></label>
                <label className="dash-field">Email<input value={book.email} onChange={e => setBook({ ...book, email: e.target.value })} type="email" placeholder="name@example.com" autoComplete="email" /></label>
                <label className="dash-field dbk-doc">Doctor name<input value={me.name} readOnly disabled title="Appointments are booked under your signed-in account" /></label>
                <label className="dash-field dbk-doc">Date of visit<input value={prettyDate(book.date)} readOnly disabled /></label>
                <label className="dash-field wide">Address<input value={book.address} onChange={e => setBook({ ...book, address: e.target.value })} placeholder="House no, street, city" autoComplete="street-address" /></label>
              </div>
            ) : (
              <>
                <label className="dash-book__field">Registered patient
                  <select value={book.patient_id} onChange={e => setBook({ ...book, patient_id: e.target.value })} required>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ''}</option>)}
                  </select>
                </label>
                <div className="dash-fields">
                  <label className="dash-field dbk-doc">Doctor name<input value={me.name} readOnly disabled /></label>
                </div>
              </>
            )}
            <label className="dash-book__field">Disease / reason
              <input value={book.reason} onChange={e => setBook({ ...book, reason: e.target.value })} placeholder="e.g. tooth pain, checkup…" />
            </label>
            {treatments.length > 0 && (
              <div className="reasonchips" aria-label="Quick reasons">
                {treatments.slice(0, 8).map(t => (
                  <button key={t.id} type="button" className={book.reason === t.name ? 'reasonchip is-on' : 'reasonchip'}
                    title={`Typically ${t.default_minutes} min`}
                    onClick={() => setBook(b => ({ ...b, reason: t.name, minutes: t.default_minutes || b.minutes }))}>{t.name}</button>
                ))}
              </div>
            )}
            <p className="dash-book-note">Walk-ins with a mobile number are registered automatically (an existing number is reused, so the visit links to their record).</p>
          </section>

          <section className="dash-book__sec">
            <div className="dash-book__sec-head"><span className="secnum" aria-hidden="true">2</span><h4>Day & time</h4><small>your working hours only</small></div>
            <div className="daychips">
              <button type="button" className={book.date === today() ? 'daychip is-on' : 'daychip'} onClick={() => setBook(b => ({ ...b, date: today() }))}>Today</button>
              <button type="button" className={book.date === tomorrow() ? 'daychip is-on' : 'daychip'} onClick={() => setBook(b => ({ ...b, date: tomorrow() }))}>Tomorrow</button>
              <input type="date" value={book.date} onChange={e => setBook({ ...book, date: e.target.value })} required aria-label="Pick a date" />
            </div>

            {slots === undefined && (
              <div className="slotgrid" aria-hidden="true">{Array.from({ length: 8 }).map((_, i) => <span key={i} className="slotchip slotchip--skeleton" />)}</div>
            )}
            {Array.isArray(slots) && slots.length > 0 && (<>
              <p className="slotnote">{slots.length} free slot{slots.length === 1 ? '' : 's'} on {prettyDate(book.date)}</p>
              <div className="slotgrid">
                {slots.map(s => (
                  <button key={s.time} type="button" className={book.time === s.time ? 'slotchip is-on' : 'slotchip'} onClick={() => setBook(b => ({ ...b, time: s.time }))}>{fmt12(s.time)}</button>
                ))}
              </div>
            </>)}
            {Array.isArray(slots) && slots.length === 0 && (
              <p className="slotempty">Fully booked or a day off — pick another day, or type a custom time below.</p>
            )}
            <label className="dash-book__custom">Custom start time
              <input type="time" value={book.time} onChange={e => setBook({ ...book, time: e.target.value })} required />
            </label>
          </section>

          <section className="dash-book__sec">
            <div className="dash-book__sec-head"><span className="secnum" aria-hidden="true">3</span><h4>Visit length</h4><small>duration</small></div>
            <div className="durchips" role="group" aria-label="Duration">
              {[15, 30, 45, 60].map(m => (
                <button key={m} type="button" className={+book.minutes === m ? 'durchip is-on' : 'durchip'} onClick={() => setBook(b => ({ ...b, minutes: m }))}>{m} min</button>
              ))}
            </div>
          </section>

          {bookErr && <p className="dash-book__err" role="alert"><AlertTriangle size={15} /> {bookErr}</p>}

          <div className="dash-book__foot">
            <button type="submit" className="dash-book__submit" disabled={bookBusy}>
              <CalendarCheck size={17} /> {bookBusy ? 'Booking…' : 'Book appointment'}
            </button>
          </div>
        </form>
      )}

      {addOpen && (activeSection === 'overview' || activeSection === 'patients') && isDentist && (
        <form className="panel rowForm dash-form" onSubmit={addNewPatient} aria-label="Add patient">
          <div className="dash-form-head">
            <span className="dash-form-icon" aria-hidden="true"><UserRound size={20} /></span>
            <div>
              <h3>Add patient</h3>
              <p>Register a new patient in the clinic.</p>
            </div>
          </div>
          <div className="rowForm grid3">
            <label>Name <input value={addPatient.name} onChange={e => setAddPatient({ ...addPatient, name: e.target.value })} required /></label>
            <label>Phone <input value={addPatient.phone} onChange={e => setAddPatient({ ...addPatient, phone: e.target.value })} placeholder="+91…" /></label>
            <label>Date of birth <input type="date" value={addPatient.dob} onChange={e => setAddPatient({ ...addPatient, dob: e.target.value })} /></label>
            <label>Gender
              <select value={addPatient.gender} onChange={e => setAddPatient({ ...addPatient, gender: e.target.value })}>
                <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
              </select>
            </label>
            <label className="wide">Medical notes / allergies <input value={addPatient.medical_notes} onChange={e => setAddPatient({ ...addPatient, medical_notes: e.target.value })} placeholder="e.g. Allergic to penicillin" /></label>
          </div>
          <div className="dash-form-foot">
            <button type="submit" className="dash-form-submit"><Check size={16} /> Save patient</button>
            <button type="button" className="dash-form-cancel" onClick={() => setAddOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {activeSection !== 'billing' && activeSection !== 'week' && activeSection !== 'insights' && activeSection !== 'recall' && (
        <div className={`grid2 dashboard-panels${activeSection === 'overview' ? '' : ' dashboard-panels--single'}`}>
          {(activeSection === 'overview' || activeSection === 'appointments') && <section className="panel" id="appointments">
            <div className="panelhead">
              <div><span className="panel-eyebrow">YOUR SCHEDULE</span><h3>Appointments</h3></div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Appointment date" />
            </div>
            {appts.length === 0 && <p className="empty"><CalendarCheck size={22} /> No appointments today.</p>}
            <ul className="list apptlist">
              {appts.map(a => (
                <li key={a.id} className="appt">
                  <span className="timechip">{fmt12(a.start_time)}<small>{fmt12(a.end_time)}</small></span>
                  <PatAvatar name={a.patient_name} />
                  <span className="apptbody">
                    <b>{a.patient_name || 'Walk-in'}</b>
                    {a.source === 'public' && <span className="badge">public</span>}
                    <span className="muted"> — {a.reason || 'Consultation'}</span>
                    {(a.email || a.address) && (
                      <span className="muted appt-contact">
                        {a.email && <span title="Email">{a.email}</span>}
                        {a.email && a.address && <span className="appt-sep">·</span>}
                        {a.address && <span title="Address">{a.address}</span>}
                      </span>
                    )}
                    <span className="rowgap">
                      {a.status === 'scheduled' && <button type="button" className="mini mini--ok" onClick={() => setStatus(a.id, 'completed')}><Check size={13} /> complete</button>}
                      {a.status === 'scheduled' && <button type="button" className="mini mini--warn" onClick={() => setStatus(a.id, 'no_show')}><Clock size={13} /> no-show</button>}
                      {a.status === 'scheduled' && <button type="button" className="mini mini--danger" onClick={() => cancelAppt(a.id)}><XMark size={13} /> cancel</button>}
                      {a.status !== 'scheduled' && <button type="button" className="mini" onClick={() => setStatus(a.id, 'scheduled')}><RotateCcw size={13} /> reopen</button>}
                    </span>
                  </span>
                  <span className={'stchip st-' + a.status}>{a.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </section>}

          {(activeSection === 'overview' || activeSection === 'patients') && <section className="panel" id="patients">
            <div className="panelhead"><div><span className="panel-eyebrow">YOUR CLINIC</span><h3>Patient register</h3></div><span className="panel-count">{patientTotal}</span></div>
            <label className="patient-search">
              <span aria-hidden="true"><Search size={16} /></span>
              <input placeholder="Search name or phone…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search patients" />
            </label>
            {patients.length === 0 && <p className="empty"><Stethoscope size={22} /> No patients match "{q}".</p>}
            <ul className="list">
              {patients.map(p => (
                <li key={p.id} className="ptrow">
                  <span className="avatar" aria-hidden="true">{initial(p.name)}</span>
                  <span className="apptbody">
                    <a href={`#/patients/${p.id}`}><b>{p.name}</b></a>
                    {p.medical_notes && <span className="warn" title={p.medical_notes}><AlertTriangle size={13} /></span>}
                    <span className="muted"> {p.phone || ''}</span>
                  </span>
                  <a className="chev" href={`#/patients/${p.id}`} aria-label={`Open ${p.name}`}><ChevronRight size={16} /></a>
                </li>
              ))}
            </ul>
          </section>}
        </div>
      )}

      {/* ---------- v1.3: week view (drag to move a visit) ---------- */}
      {activeSection === 'week' && (
        <section className="panel">
          <div className="panelhead">
            <div><span className="panel-eyebrow">7 DAYS</span><h3>Week of {prettyDate(weekFrom)}</h3></div>
            <span className="rowgap">
              <button className="mini" onClick={() => setWeekFrom(dayAtOffset(weekFrom, -7))}>← Previous</button>
              <button className="mini" onClick={() => setWeekFrom(today())}>This week</button>
              <button className="mini" onClick={() => setWeekFrom(dayAtOffset(weekFrom, 7))}>Next →</button>
            </span>
          </div>
          <div className="weekgrid">
            {weekDays.map(d => {
              const dayList = weekAppts.filter(a => a.appointment_date === d)
              const isToday = d === today()
              return (
                <div key={d} className={'weekcol' + (isToday ? ' is-today' : '')}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => dragId && moveToDay(dragId, d)}>
                  <div className="weekcol__head">
                    <b>{shortDay(d)}</b><small>{dayNum(d)}</small>
                    <span className="weekcol__count">{dayList.length || ''}</span>
                  </div>
                  {dayList.length === 0 && <p className="weekcol__empty">free</p>}
                  {dayList.map(a => (
                    <div key={a.id} className={'weekcard st-' + a.status}
                      draggable onDragStart={() => setDragId(a.id)} onDragEnd={() => setDragId(null)}
                      title={dragId ? `Drop on ${prettyDate(d)}` : 'Drag to another day to move this visit'}>
                      <b>{fmt12(a.start_time)}</b>
                      <span className="muted"> {a.patient_name || 'Walk-in'}</span>
                      {a.source === 'public' && <span className="badge">public</span>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          <p className="muted tiny">Drag a card to another day to reschedule — the clinic's overlap rules still apply, and a clash is refused with a message.</p>
        </section>
      )}

      {/* ---------- v1.3: practice insights ---------- */}
      {activeSection === 'insights' && (
        <>
          <div className="stats ref-stats ref-stats--4">
            <div className="stat stat--mint">
              <span className="stat-icon stat-icon--green" aria-hidden="true"><IndianRupee size={20} /></span>
              <div className="stat-body">
                <span className="statlabel">COLLECTED (30 DAYS)</span>
                <span className="statnum">{money(insights?.revenue_collected)}</span>
                <span className="stat-foot">payments recorded</span>
              </div>
            </div>
            <div className="stat stat--sky">
              <span className="stat-icon stat-icon--sky" aria-hidden="true"><CalendarCheck size={20} /></span>
              <div className="stat-body">
                <span className="statlabel">APPOINTMENTS</span>
                <span className="statnum">{insights?.appointments ?? '—'}</span>
                <span className="stat-foot">{insights?.completed ?? 0} completed</span>
              </div>
            </div>
            <div className="stat stat--amber">
              <span className="stat-icon stat-icon--amber" aria-hidden="true"><AlertTriangle size={20} /></span>
              <div className="stat-body">
                <span className="statlabel">NO-SHOW RATE</span>
                <span className="statnum">{insights?.no_show?.rate ?? 0}%</span>
                <span className="stat-foot">{insights?.no_show?.no_shows ?? 0} of {insights?.no_show?.total ?? 0}</span>
              </div>
            </div>
            <div className="stat stat--teal">
              <span className="stat-icon stat-icon--teal" aria-hidden="true"><Users size={20} /></span>
              <div className="stat-body">
                <span className="statlabel">NEW PATIENTS</span>
                <span className="statnum">{insights?.new_patients ?? 0}</span>
                <span className="stat-foot">added in this window</span>
              </div>
            </div>
          </div>

          <section className="panel">
            <div className="panelhead"><div><span className="panel-eyebrow">REVENUE & VISITS</span><h3>Daily trend</h3></div>
              <span className="muted">bars = money collected · dots = appointments</span></div>
            <TrendChart data={trend} />
          </section>

          <div className="grid2">
            <section className="panel">
              <h3>Top treatments</h3>
              {topTreatments.length === 0 && <p className="empty">No treatment records in this window yet.</p>}
              <ul className="list">
                {topTreatments.map(t => (
                  <li key={t.name}>
                    <span className="apptbody">
                      <b>{t.name}</b>
                      <span className="ref-status-track" style={{ width: 120 }}>
                        <i style={{ width: `${Math.round((t.c / Math.max(1, topTreatments[0].c)) * 100)}%`, background: 'var(--mint)' }} />
                      </span>
                    </span>
                    <span className="muted">{t.c}× · {money(t.v)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel">
              <h3>Chair utilisation</h3>
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

      {/* ---------- v1.3: recall list ---------- */}
      {activeSection === 'recall' && (
        <section className="panel">
          <div className="panelhead">
            <div><span className="panel-eyebrow">FOLLOW-UP</span><h3>Due for a check-up</h3></div>
            <span className="panel-count">{recall.length}</span>
          </div>
          {recall.length === 0 && <p className="empty"><Phone size={22} /> Everyone has visited in the last 6 months — no recalls due.</p>}
          <ul className="list">
            {recall.map(p => (
              <li key={p.id} className="ptrow">
                <span className="avatar" aria-hidden="true">{initial(p.name)}</span>
                <span className="apptbody">
                  <a href={`#/patients/${p.id}`}><b>{p.name}</b></a>
                  <span className="muted"> {p.phone || ''}</span>
                  <span className="muted"> · {p.visits} visit{p.visits === 1 ? '' : 's'}</span>
                </span>
                <span className={'stchip ' + (p.due === 'never-seen' ? 'st-cancelled' : 'st-scheduled')}>
                  {p.due === 'never-seen' ? 'never seen' : `last visit ${p.due}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === 'billing' && <section className="panel dashboard-billing" id="billing">
        <div className="panelhead">
          <div><span className="panel-eyebrow">PAYMENTS TO FOLLOW UP</span><h3>Unpaid invoices</h3></div>
          <span className="billing-total">{money(due)} <small>outstanding</small></span>
        </div>
        {invoices.length === 0 && <p className="empty"><IndianRupee size={22} /> All invoices are settled.</p>}
        <ul className="list">
          {invoices.map(i => {
            const left = i.amount - i.discount - i.paid_amount
            return (
              <li key={i.id} className="invrow">
                <span>
                  <b>#{i.id}</b> {money(i.amount)}{i.discount ? ` − ${money(i.discount)}` : ''} · paid {money(i.paid_amount)}
                  {left > 0 && <span className="muted"> · {money(left)} left</span>}
                </span>
                <span className="rowgap">
                  <a className="mini" href={`#/patients/${i.patient_id}`}>patient</a>
                  <a className="mini" href={`#/plans/${i.plan_id || ''}`} style={i.plan_id ? null : { visibility: 'hidden' }}>plan</a>
                  <button className="mini" onClick={() => showUpi(i.id)}>UPI link</button>
                  <button className="mini" onClick={() => { setPayFor(payFor === i.id ? null : i.id); setPayForm({ amount: String(left), method: 'upi', reference: '' }); setMsg('') }}>
                    record payment
                  </button>
                  <button className="mini mini--ok" onClick={() => pay(i.id, true)}><Check size={13} /> mark fully paid</button>
                  {i.status === 'unpaid' && <button className="mini mini--warn" onClick={() => pay(i.id, false)}>half payment</button>}
                </span>
                {payFor === i.id && (
                  <form className="panel payform" onSubmit={recordPayment} aria-label={`Record payment for invoice ${i.id}`}>
                    <div className="grid3">
                      <label>Amount <input type="number" min="1" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required /></label>
                      <label>Method
                        <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                          <option value="upi">UPI</option><option value="cash">Cash</option>
                          <option value="card">Card</option><option value="bank">Bank transfer</option><option value="other">Other</option>
                        </select>
                      </label>
                      <label>Reference <small>(optional)</small>
                        <input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} placeholder="UPI ref / last 4 digits" />
                      </label>
                    </div>
                    <span className="rowgap">
                      <button type="submit" className="btn"><Check size={15} /> Save payment</button>
                      <button type="button" className="mini" onClick={() => setPayFor(null)}>Cancel</button>
                    </span>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      </section>}
      </main>
    </div>
  )
}

// helper: a week starting from a given ISO day shifted by n days
function dayAtOffset(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setDate(d.getDate() + n)
  return isoOf(d)
}
