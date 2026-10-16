import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import DentEraMark from '../components/DentEraMark.jsx'
import {
  Home, LayoutGrid, UserRound, IndianRupee, Plus, Check, XMark, RotateCcw, Clock,
  Search, MessageCircle, Shield, AlertTriangle, ChevronRight, CalendarCheck, Users,
  Calendar, ClipboardList, Stethoscope, LogOut, PieChart, BarChart,
} from '../components/Icons.jsx'
import '../dashboard.css'

const pad = n => String(n).padStart(2, '0')
const fmt12 = t => { const [h, m] = (t || '').split(':').map(Number); if (Number.isNaN(h)) return t || ''
  const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}` }
const addMin = (t, m) => { const [h, mm] = String(t || '09:00').split(':').map(Number)
  const tot = (h * 60 + mm) + (+m || 30); return `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}` }
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => isoOf(new Date())
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return isoOf(d) }
const prettyDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) }
const shortDay = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'short' }) }
const dayNum = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return ''
  return new Date(+m[1], +m[2] - 1, +m[3]).getDate() }
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const initial = n => (n || '?').replace(/^Dr\.?\s*/i, '').trim()[0]?.toUpperCase() || '?'
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN')

const STATUS_ORDER = ['scheduled', 'completed', 'no_show', 'cancelled']
const STATUS_META = {
  scheduled: { label: 'Scheduled', color: '#0ea5e9' },
  completed: { label: 'Completed', color: '#22c55e' },
  no_show: { label: 'No-show', color: '#f59e0b' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
}

/* Donut — pure SVG, no chart library. Segments = today's appointment statuses. */
function Donut({ counts, total }) {
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  const segs = total
    ? STATUS_ORDER.map(k => { const frac = counts[k] / total; const seg = { k, frac, offset: acc }; acc += frac; return seg })
      .filter(s => s.frac > 0)
    : []
  return (
    <svg viewBox="0 0 140 140" className="ref-donut" role="img" aria-label={`Appointment status split — ${total} today`}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#eef1f6" strokeWidth="16" />
      {segs.map(s => (
        <circle key={s.k} cx="70" cy="70" r={R} fill="none" stroke={STATUS_META[s.k].color} strokeWidth="16"
          strokeDasharray={`${s.frac * C} ${C - s.frac * C}`} strokeDashoffset={-s.offset * C}
          transform="rotate(-90 70 70)" />
      ))}
      <text x="70" y="68" textAnchor="middle" className="ref-donut-num">{total}</text>
      <text x="70" y="88" textAnchor="middle" className="ref-donut-cap">today</text>
    </svg>
  )
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

  // booking studio state
  const [bookOpen, setBookOpen] = useState(false)
  const [book, setBook] = useState({ patient_id: '', patient_name: '', date: today(), time: '10:00', minutes: 30, reason: 'Consultation' })
  const [bookErr, setBookErr] = useState('')
  const [slots, setSlots] = useState(null)          // undefined = loading, null = fall back to manual time
  const [treatments, setTreatments] = useState([])
  const slotsSeq = useRef(0)

  // weekly workload bar chart (next 7 days)
  const [week, setWeek] = useState([])
  const [weekTick, setWeekTick] = useState(0)
  const weekSeq = useRef(0)

  const [addOpen, setAddOpen] = useState(false)
  const [addPatient, setAddPatient] = useState({ name: '', phone: '', dob: '', gender: '', medical_notes: '' })

  async function load() {
    const [a, p, pt, i] = await Promise.all([
      api.get(`/api/appointments?date=${date}`), api.get(`/api/patients?q=${encodeURIComponent(q)}`),
      api.get('/api/patients?q='), api.get('/api/invoices?status=unpaid')])
    setAppts(a.data.data || []); setPatients(p.data.data || [])
    setPatientTotal((pt.data.data || []).length); setInvoices(i.data.data || [])
  }

  useEffect(() => {
    let live = true
    async function pull() { await load(); if (!live) return }
    pull(); const t = setInterval(pull, 60000)
    return () => { live = false; clearInterval(t) }
  }, [date, q]) // eslint-disable-line react-hooks/exhaustive-deps

  // treatment catalogue powers the reason quick-picks (duration auto-syncs per treatment)
  useEffect(() => {
    if (me.role !== 'dentist') return
    let live = true
    api.get('/api/treatments').then(({ data }) => { if (live) setTreatments(data.data || []) }).catch(() => {})
    return () => { live = false }
  }, [me.role])

  // free slots for the booking form — fetched live while the form is open (race-guarded)
  useEffect(() => {
    if (!bookOpen || me.role !== 'dentist') return
    const seq = ++slotsSeq.current
    let live = true
    setSlots(undefined)
    api.get(`/api/slots?date=${book.date}`).then(({ status, data }) => {
      if (live && seq === slotsSeq.current) setSlots(status === 200 ? (data.data || []) : null)
    }).catch(() => { if (live && seq === slotsSeq.current) setSlots(null) })
    return () => { live = false }
  }, [bookOpen, book.date, me.role])

  // next-7-days appointment counts for the workload chart (dentists only, refetched after writes)
  useEffect(() => {
    if (activeSection !== 'overview' || me.role !== 'dentist') return
    const seq = ++weekSeq.current
    let live = true
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return isoOf(d) })
    Promise.all(days.map(d => api.get(`/api/appointments?date=${d}`).catch(() => ({ data: { data: [] } }))))
      .then(res => { if (live && seq === weekSeq.current) setWeek(days.map((d, i) => ({ date: d, count: (res[i].data.data || []).length }))) })
    return () => { live = false }
  }, [activeSection, me.role, weekTick])

  async function logout() { await api.post('/api/auth/logout'); onLogout(); location.hash = '#/' }

  const allInvoices = invoices
  const due = allInvoices.reduce((s, i) => s + (i.amount - i.discount - i.paid_amount), 0)
  const doneToday = appts.filter(a => a.status === 'completed').length

  const statusCounts = { scheduled: 0, completed: 0, no_show: 0, cancelled: 0 }
  appts.forEach(a => { if (statusCounts[a.status] != null) statusCounts[a.status]++ })
  const statusTotal = STATUS_ORDER.reduce((s, k) => s + statusCounts[k], 0)
  const nextAppt = appts.filter(a => a.status === 'scheduled')
    .sort((x, y) => String(x.start_time || '').localeCompare(String(y.start_time || '')))[0] || null
  const weekMax = Math.max(1, ...week.map(w => w.count))

  const pageCopy = {
    overview: {
      eyebrow: 'CLINIC OVERVIEW',
      title: `${greet()}, ${me.name.replace(/^Dr\.?\s*/i, 'Dr. ')}`,
      description: `${prettyDate(date)} — here's your clinic today.`
    },
    appointments: {
      eyebrow: 'YOUR SCHEDULE',
      title: 'Appointments',
      description: 'Review and manage your clinic schedule.'
    },
    patients: {
      eyebrow: 'YOUR CLINIC',
      title: 'Patient register',
      description: 'Find patient records and keep your clinic details up to date.'
    },
    billing: {
      eyebrow: 'PAYMENTS TO FOLLOW UP',
      title: 'Billing',
      description: 'Review outstanding invoices and update payment status.'
    }
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
    // the chosen duration is honoured — end_time is computed and sent
    const end_time = addMin(book.time, +book.minutes)
    const body = book.patient_id
      ? { patient_id: +book.patient_id, date: book.date, start_time: book.time, end_time, reason: book.reason }
      : { patient_name: book.patient_name, date: book.date, start_time: book.time, end_time, reason: book.reason }
    const { status, data } = await api.post('/api/appointments', body)
    if (status === 201) {
      const who = book.patient_id
        ? ((patients.find(p => p.id === +book.patient_id) || {}).name || 'the patient')
        : (book.patient_name || 'the patient')
      setMsg(`Booked ${who} at ${fmt12(book.time)} on ${prettyDate(book.date)} — the slot is protected.`)
      setBookOpen(false); load(); setWeekTick(t => t + 1)
    } else setBookErr(data.message || 'Could not book — please try another time.')
  }

  async function setStatus(id, status) {
    setMsg('')
    const { status: code, data } = await api.patch(`/api/appointments/${id}`, { status })
    setMsg(code === 200 ? `Marked ${status.replace('_', ' ')}.` : (data.message || 'Failed.'))
    load(); setWeekTick(t => t + 1)
  }

  async function cancelAppt(id) {
    setMsg('')
    const { data } = await api.del(`/api/appointments/${id}`)
    setMsg(data.ok ? 'Appointment cancelled.' : (data.message || 'Failed.'))
    load(); setWeekTick(t => t + 1)
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
    const inv = allInvoices.find(i => i.id === invId)
    const amount = full ? (inv.amount - inv.discount) : Math.round((inv.amount - inv.discount) / 2)
    const { data } = await api.patch(`/api/invoices/${invId}`, { paid_amount: amount })
    setMsg(data.data ? `Invoice #${invId} → ${data.data.status}.` : (data.message || 'Failed.'))
    load()
  }

  const isDentist = me.role === 'dentist'
  const walkInMode = !book.patient_id
  const bookedPatient = book.patient_id ? patients.find(p => p.id === +book.patient_id) : null
  const ticketName = bookedPatient ? bookedPatient.name : (book.patient_name || '')
  const ticketEnd = addMin(book.time, +book.minutes)

  return (
    <div className="view dashboard-page">
      <aside className="dashboard-sidebar" aria-label="Clinic navigation">
        <a className="brand dashboard-brand" href="#/" aria-label="DentEra home">
          <span className="brand-mark"><DentEraMark /></span>
          <span>DentEra<small>CLINIC WORKSPACE</small></span>
        </a>

        <div className="ref-profile">
          <span className="ref-profile-avatar" aria-hidden="true">{initial(me.name)}</span>
          <b>{me.name}</b>
          <small>{isDentist ? (me.specialty || 'Dentist') : (me.role || 'Staff')}</small>
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard sections">
          <button type="button" className={activeSection === 'overview' ? 'is-active' : ''} aria-current={activeSection === 'overview' ? 'page' : undefined} onClick={() => setActiveSection('overview')}><span aria-hidden="true"><Home size={17} /></span>Overview</button>
          <button type="button" className={activeSection === 'appointments' ? 'is-active' : ''} aria-current={activeSection === 'appointments' ? 'page' : undefined} onClick={() => setActiveSection('appointments')}><span aria-hidden="true"><LayoutGrid size={17} /></span>Appointments</button>
          <button type="button" className={activeSection === 'patients' ? 'is-active' : ''} aria-current={activeSection === 'patients' ? 'page' : undefined} onClick={() => setActiveSection('patients')}><span aria-hidden="true"><UserRound size={17} /></span>Patients</button>
          <button type="button" className={activeSection === 'billing' ? 'is-active' : ''} aria-current={activeSection === 'billing' ? 'page' : undefined} onClick={() => setActiveSection('billing')}><span aria-hidden="true"><IndianRupee size={17} /></span>Billing</button>
        </nav>

        <button type="button" className="ref-signout" onClick={logout}><LogOut size={16} /> Sign out</button>
      </aside>

      <main className="dashboard-main" id="overview">
      <div className="topbar dashboard-toolbar">
        <h1 className="ref-topbar-title">Dashboard</h1>
        <span className="spacer" />
        {(me.role === 'admin' || me.role === 'reception') && <a className="mini" href="#/admin"><Shield size={14} /> Admin panel</a>}
        <a className="mini" href="#/book">Public booking</a>
        {isDentist && <button className="mini primary ask-era" onClick={onChat}><MessageCircle size={14} /> Ask Era</button>}
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
        </div>

        <div className="ref-grid ref-grid--a">
          <section className="panel ref-card">
            <div className="ref-card-head">
              <div className="ref-card-title">
                <span className="ref-card-icon" aria-hidden="true"><PieChart size={17} /></span>
                <div><span className="panel-eyebrow">TODAY</span><h3>Appointment Summary</h3></div>
              </div>
              <span className="ref-card-date">{prettyDate(date)}</span>
            </div>
            <div className="ref-donut-wrap">
              <Donut counts={statusCounts} total={statusTotal} />
              <ul className="ref-legend">
                {STATUS_ORDER.map(k => (
                  <li key={k}><i style={{ background: STATUS_META[k].color }} aria-hidden="true" />
                    <span>{STATUS_META[k].label}</span><b>{Math.round((statusCounts[k] / (statusTotal || 1)) * 100)}%</b></li>
                ))}
              </ul>
            </div>
          </section>

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
                  <span className="ref-next-avatar" aria-hidden="true">{initial(nextAppt.patient_name)}</span>
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
                <p className="ref-next-note"><ClipboardList size={14} /> {nextAppt.reason || 'Consultation'} — slot protected, overlaps refused.</p>
                <div className="ref-next-actions">
                  <a className="ref-btn ref-btn--line" href={`#/patients/${nextAppt.patient_id || ''}`} style={nextAppt.patient_id ? null : { visibility: 'hidden' }}>Open chart</a>
                  <button type="button" className="ref-btn" onClick={() => setStatus(nextAppt.id, 'completed')}><Check size={14} /> Mark complete</button>
                  <button type="button" className="ref-btn ref-btn--warn" onClick={() => setStatus(nextAppt.id, 'no_show')}>No-show</button>
                </div>
              </div>
            ) : (
              <p className="empty"><CalendarCheck size={22} /> {appts.length ? 'All caught up — no scheduled visits left today.' : 'No appointments this day.'}</p>
            )}
          </section>
        </div>

        {isDentist && <div className="ref-grid ref-grid--b">
          <section className="panel ref-card">
            <div className="ref-card-head">
              <div className="ref-card-title">
                <span className="ref-card-icon" aria-hidden="true"><BarChart size={17} /></span>
                <div><span className="panel-eyebrow">WORKLOAD</span><h3>Next 7 Days</h3></div>
              </div>
              <span className="ref-card-date">{week.reduce((s, w) => s + w.count, 0)} visits scheduled</span>
            </div>
            {week.length ? (
              <div className="ref-bars" role="img" aria-label="Appointments per day for the next 7 days">
                {week.map(w => (
                  <div key={w.date} className="ref-bar-col" title={`${prettyDate(w.date)} — ${w.count} appointment${w.count === 1 ? '' : 's'}`}>
                    <span className="ref-bar-count">{w.count || ''}</span>
                    <span className="ref-bar-track"><i className={'ref-bar' + (w.date === today() ? ' is-today' : '')} style={{ height: `${Math.max(8, (w.count / weekMax) * 100)}%` }} /></span>
                    <span className="ref-bar-label">{shortDay(w.date)}<small>{dayNum(w.date)}</small></span>
                  </div>
                ))}
              </div>
            ) : <p className="empty"><BarChart size={22} /> Loading your week…</p>}
          </section>

          <section className="panel ref-card">
            <div className="ref-card-head">
              <div className="ref-card-title">
                <span className="ref-card-icon" aria-hidden="true"><LayoutGrid size={17} /></span>
                <div><span className="panel-eyebrow">TODAY</span><h3>Status Breakdown</h3></div>
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
        </div>}
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

          <div className="dash-book__cols">
            <div className="dash-book__steps">
              <section className="dash-book__sec">
                <div className="dash-book__sec-head"><span className="secnum" aria-hidden="true">1</span><h4>Patient</h4></div>
                <div className="seg" role="group" aria-label="Patient type">
                  <button type="button" className={walkInMode ? 'seg__btn is-on' : 'seg__btn'} aria-pressed={walkInMode} onClick={() => setBook(b => ({ ...b, patient_id: '' }))}>Walk-in</button>
                  <button type="button" className={!walkInMode ? 'seg__btn is-on' : 'seg__btn'} aria-pressed={!walkInMode} disabled={!patients.length}
                    onClick={() => setBook(b => ({ ...b, patient_id: b.patient_id || (patients[0] ? String(patients[0].id) : '') }))}>Registered{!patients.length ? ' · none' : ''}</button>
                </div>
                {walkInMode ? (
                  <label className="dash-book__field">Walk-in name
                    <input value={book.patient_name} onChange={e => setBook({ ...book, patient_name: e.target.value })} placeholder="e.g. Ravi Kumar" required />
                  </label>
                ) : (
                  <label className="dash-book__field">Registered patient
                    <select value={book.patient_id} onChange={e => setBook({ ...book, patient_id: e.target.value })} required>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ''}</option>)}
                    </select>
                  </label>
                )}
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
                <div className="dash-book__sec-head"><span className="secnum" aria-hidden="true">3</span><h4>Visit</h4><small>duration & reason</small></div>
                <div className="durchips" role="group" aria-label="Duration">
                  {[15, 30, 45, 60].map(m => (
                    <button key={m} type="button" className={+book.minutes === m ? 'durchip is-on' : 'durchip'} onClick={() => setBook(b => ({ ...b, minutes: m }))}>{m} min</button>
                  ))}
                </div>
                <label className="dash-book__field">Reason
                  <input value={book.reason} onChange={e => setBook({ ...book, reason: e.target.value })} placeholder="e.g. Consultation" />
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
              </section>

              {bookErr && <p className="dash-book__err" role="alert"><AlertTriangle size={15} /> {bookErr}</p>}
            </div>

            <aside className="dash-book__ticket">
              <span className="dash-book__ticket-eyebrow">APPOINTMENT PREVIEW</span>
              <div className="dash-ticket-card">
                <div className="dash-ticket-pat">
                  <span className="avatar" aria-hidden="true">{initial(ticketName)}</span>
                  <div>
                    <small>{walkInMode ? 'Walk-in' : 'Registered'}</small>
                    <b>{ticketName || '— add a name —'}</b>
                  </div>
                </div>
                <div className="dash-ticket-rows">
                  <span className="dash-ticket-row"><Calendar size={15} /> {prettyDate(book.date)} <small>day</small></span>
                  <span className="dash-ticket-row"><Clock size={15} /> {fmt12(book.time)} – {fmt12(ticketEnd)} <small>{book.minutes} min</small></span>
                  <span className="dash-ticket-row"><ClipboardList size={15} /> <span className="dash-ticket-reason">{book.reason || 'Consultation'}</span> <small>reason</small></span>
                </div>
              </div>
              <button type="submit" className="dash-book__cta"><CalendarCheck size={17} /> Confirm appointment</button>
              <button type="button" className="dash-book__ghost" onClick={() => setBookOpen(false)}>Discard</button>
            </aside>
          </div>
        </form>
      )}

      {addOpen && (activeSection === 'overview' || activeSection === 'patients') && isDentist && (
        <form className="panel rowForm dash-form" onSubmit={addNewPatient} aria-label="Add patient">
          <div className="dash-form-head">
            <span className="dash-form-icon" aria-hidden="true"><UserRound size={20} /></span>
            <div>
              <h3>Add patient</h3>
              <p>New faces take less than a minute to register.</p>
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

      {activeSection !== 'billing' && <div className={`grid2 dashboard-panels${activeSection === 'overview' ? '' : ' dashboard-panels--single'}`}>
        {(activeSection === 'overview' || activeSection === 'appointments') && <section className="panel" id="appointments">
          <div className="panelhead">
            <div><span className="panel-eyebrow">YOUR SCHEDULE</span><h3>Appointments</h3></div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Appointment date" />
          </div>
          {appts.length === 0 && <p className="empty"><CalendarCheck size={22} /> No appointments this day — enjoy the quiet.</p>}
          <ul className="list apptlist">
            {appts.map(a => (
              <li key={a.id} className="appt">
                <span className="timechip">{fmt12(a.start_time)}<small>{fmt12(a.end_time)}</small></span>
                <span className="ref-row-avatar" aria-hidden="true">{initial(a.patient_name)}</span>
                <span className="apptbody">
                  <b>{a.patient_name || 'Walk-in'}</b>
                  {a.source === 'public' && <span className="badge">public</span>}
                  <span className="muted"> — {a.reason || 'Consultation'}</span>
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
      </div>}

      {activeSection === 'billing' && <section className="panel dashboard-billing" id="billing">
        <div className="panelhead">
          <div><span className="panel-eyebrow">PAYMENTS TO FOLLOW UP</span><h3>Unpaid invoices</h3></div>
          <span className="billing-total">{money(due)} <small>outstanding</small></span>
        </div>
        {invoices.length === 0 && <p className="empty"><IndianRupee size={22} /> All invoices are settled.</p>}
        <ul className="list">
          {invoices.map(i => (
            <li key={i.id} className="invrow">
              <span><b>#{i.id}</b> {money(i.amount)}{i.discount ? ` − ${money(i.discount)}` : ''} · paid {money(i.paid_amount)}</span>
              <span className="rowgap">
                <a className="mini" href={`#/patients/${i.patient_id}`}>patient</a>
                <a className="mini" href={`#/plans/${i.plan_id || ''}`} style={i.plan_id ? null : { visibility: 'hidden' }}>plan</a>
                <button className="mini mini--ok" onClick={() => pay(i.id, true)}><Check size={13} /> mark fully paid</button>
                <button className="mini mini--warn" onClick={() => pay(i.id, false)}>half payment</button>
              </span>
            </li>
          ))}
        </ul>
      </section>}
      </main>
    </div>
  )
}
