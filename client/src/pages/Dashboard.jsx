import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import DentEraMark from '../components/DentEraMark.jsx'
import {
  Home, LayoutGrid, UserRound, IndianRupee, Plus, Check, XMark, RotateCcw, Clock,
  Search, MessageCircle, Shield, AlertTriangle, ChevronRight, CalendarCheck, Users,
  ClipboardList, Stethoscope, LogOut, Globe, Menu, Bell, ChevronDown,
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
// "known for" copy the profile sheet shows under the doctor's photo
const FAMOUS_FOR = {
  'General Dentistry': 'a gentle chair-side manner, painless fillings and thorough check-ups — the dentist whole families come back to.',
  'Orthodontics': 'braces and clear-aligner plans that straighten smiles comfortably, with reviews that fit school and work schedules.',
  'Cosmetic Dentistry': 'natural-looking smile makeovers — bonding, whitening and veneers that still look like you.',
  'Endodontics': 'calm, precise root canals — most patients are surprised it is already over.',
  'Periodontics': 'gum care that stops bleeding and keeps teeth firmly in place for the long run.',
  'Oral Surgery': 'smooth, well-predicted extractions and implants with journeys that heal fast.',
  'Paediatric Dentistry': 'making little ones actually look forward to the dentist — gentle, playful care that stops cavities early.',
  'Prosthodontics': 'crowns, bridges and dentures that fit and look natural from the first trial.',
}
const famousFor = specialty => FAMOUS_FOR[specialty] || 'honest advice and gentle treatment — every appointment starts on time.'

// stock portrait for the signed-in doctor's profile photo
const doctorPhoto = id => `/doctor-${((((id || 1) - 1) % 8) + 8) % 8 + 1}.jpg`

// the phone breakpoint the dashboard CSS drawer / bottom-nav rules key off.
// Kept as one constant so JS and CSS can never drift apart again.
const PHONE_BP = '(max-width: 900px)'

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
  const [profileOpen, setProfileOpen] = useState(false) // profile sheet: doctor photo + about
  const [sideCollapsed, setSideCollapsed] = useState(false) // desktop: sidebar collapsed to give the panel room
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE_BP).matches)

  // the burger opens the drawer on phones, collapses the sidebar on desktop
  useEffect(() => {
    const mq = window.matchMedia(PHONE_BP)
    const onChange = e => { setNarrow(e.matches); if (!e.matches) setSideOpen(false) }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Escape closes the drawer / profile sheet — phones have no reliable "click outside" affordance
  useEffect(() => {
    if (!sideOpen && !profileOpen) return
    const onKey = e => { if (e.key === 'Escape') { setSideOpen(false); setProfileOpen(false) } }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [sideOpen, profileOpen])

  // booking studio state
  const [bookOpen, setBookOpen] = useState(false)
  const [book, setBook] = useState({ patient_id: '', fname: '', lname: '', phone: '', email: '', address: '', date: today(), time: '10:00', minutes: 30, reason: 'Consultation' })
  const [bookErr, setBookErr] = useState('')
  const [bookBusy, setBookBusy] = useState(false)
  const [slots, setSlots] = useState(null)          // undefined = loading, null = fall back to manual time
  const [treatments, setTreatments] = useState([])
  const slotsSeq = useRef(0)

  const [addOpen, setAddOpen] = useState(false)
  const [addPatient, setAddPatient] = useState({ name: '', phone: '', dob: '', gender: '', medical_notes: '' })

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

  async function logout() { await api.post('/api/auth/logout'); onLogout(); location.hash = '#/' }

  const due = invoices.reduce((s, i) => s + (i.amount - i.discount - i.paid_amount), 0)
  const doneToday = appts.filter(a => a.status === 'completed').length

  const statusCounts = { scheduled: 0, completed: 0, no_show: 0, cancelled: 0 }
  appts.forEach(a => { if (statusCounts[a.status] != null) statusCounts[a.status]++ })
  const statusTotal = STATUS_ORDER.reduce((s, k) => s + statusCounts[k], 0)
  const nextAppt = appts.filter(a => a.status === 'scheduled')
    .sort((x, y) => String(x.start_time || '').localeCompare(String(y.start_time || '')))[0] || null

  const pageCopy = {
    overview: {
      eyebrow: 'OVERVIEW',
      title: 'Dashboard',
      description: prettyDate(date)
    },
    appointments: {
      eyebrow: 'SCHEDULE',
      title: 'Appointments',
      description: 'Appointments booked for the selected day.'
    },
    patients: {
      eyebrow: 'CLINIC',
      title: 'Patient register',
      description: 'Registered patients and their contact details.'
    },
    billing: {
      eyebrow: 'BILLING',
      title: 'Unpaid invoices',
      description: 'Outstanding payments to follow up.'
    }
  }[activeSection]

  function toggleBook() {
    if (bookOpen) return setBookOpen(false)
    setBookErr(''); setBook(b => ({ ...b, date })); setBookOpen(true)
  }
  function toggleSide() {
    if (narrow) setSideOpen(o => !o)
    else setSideCollapsed(c => !c)
  }
  // the bell in the toolbar is a shortcut to the schedule list — it makes sure the
  // appointments panel is the active section, then scrolls it into view.
  function jumpToSchedule() {
    setActiveSection(a => (a === 'overview' || a === 'appointments') ? a : 'appointments')
    setSideOpen(false)
    requestAnimationFrame(() => document.getElementById('appointments')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  // the button only lights up in its non-default state: drawer open on phones, sidebar collapsed on desktop
  const sideBusy = narrow ? sideOpen : sideCollapsed
  const sideExpanded = narrow ? sideOpen : !sideCollapsed
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
    const amount = full ? (inv.amount - inv.discount) : Math.round((inv.amount - inv.discount) / 2)
    const { data } = await api.patch(`/api/invoices/${invId}`, { paid_amount: amount })
    setMsg(data.data ? `Invoice #${invId} → ${data.data.status}.` : (data.message || 'Failed.'))
    load()
  }

  const walkInMode = !book.patient_id

  return (
    <div className={'view dashboard-page' + (sideCollapsed ? ' is-collapsed' : '')}>
      <aside className={'dashboard-sidebar' + (sideOpen ? ' is-open' : '')} aria-label="Clinic navigation">
        <a className="brand dashboard-brand" href="#/" aria-label="DentEra home">
          <span className="brand-mark"><DentEraMark /></span>
          <span>DentEra<small>CLINIC WORKSPACE</small></span>
        </a>

        <button type="button" className="ref-profile" onClick={() => setProfileOpen(true)} aria-haspopup="dialog" aria-label={`Open profile — ${me.name}`}>
          <span className="ref-profile-avatar is-photo">
            <img src={doctorPhoto(me.id)} alt="" />
          </span>
          <b>{me.name}</b>
          <small>{me.role === 'dentist' ? (me.specialty || 'Dentist') : (me.role || 'Staff')}</small>
        </button>

        <nav className="dashboard-nav" aria-label="Dashboard sections">
          <button type="button" className={activeSection === 'overview' ? 'is-active' : ''} aria-current={activeSection === 'overview' ? 'page' : undefined} onClick={() => { setActiveSection('overview'); setSideOpen(false) }}><span aria-hidden="true"><Home size={17} /></span>Overview</button>
          <button type="button" className={activeSection === 'appointments' ? 'is-active' : ''} aria-current={activeSection === 'appointments' ? 'page' : undefined} onClick={() => { setActiveSection('appointments'); setSideOpen(false) }}><span aria-hidden="true"><LayoutGrid size={17} /></span>Appointments</button>
          <button type="button" className={activeSection === 'patients' ? 'is-active' : ''} aria-current={activeSection === 'patients' ? 'page' : undefined} onClick={() => { setActiveSection('patients'); setSideOpen(false) }}><span aria-hidden="true"><UserRound size={17} /></span>Patients</button>
          <button type="button" className={activeSection === 'billing' ? 'is-active' : ''} aria-current={activeSection === 'billing' ? 'page' : undefined} onClick={() => { setActiveSection('billing'); setSideOpen(false) }}><span aria-hidden="true"><IndianRupee size={17} /></span>Billing</button>
        </nav>

        <button type="button" className="ref-signout" onClick={logout}><LogOut size={16} /> Sign out</button>
      </aside>
      {sideOpen && <div className="dash-scrim" onClick={() => setSideOpen(false)} aria-hidden="true" />}

      <main className="dashboard-main" id="overview">
      <div className="topbar dashboard-toolbar">
        <button type="button" className={"dash-burger" + (sideBusy ? " is-active" : "")} aria-label={narrow ? (sideOpen ? "Close navigation menu" : "Open navigation menu") : (sideCollapsed ? "Show sidebar" : "Hide sidebar")} onClick={toggleSide} aria-expanded={sideExpanded}>
          <Menu size={22} />
        </button>
        <a className="dash-toolbar-brand" href="#/" aria-label="DentEra home">
          <span className="brand-mark"><DentEraMark /></span>
          <h1 className="ref-topbar-title">DentEra</h1>
        </a>
        <span className="spacer" />
        <button type="button" className="dash-iconbtn dash-iconbtn--bell" onClick={jumpToSchedule} aria-label={`Today's schedule — ${appts.length} appointment${appts.length === 1 ? '' : 's'}`} title="Today's schedule">
          <Bell size={18} />
          {appts.length > 0 && <span className="dash-iconbtn__badge" aria-hidden="true">{appts.length > 9 ? '9+' : appts.length}</span>}
        </button>
        {(me.role === 'admin' || me.role === 'reception') && <a className="mini" href="#/admin" title="Admin panel" aria-label="Admin panel"><Shield size={14} /><span className="hide-sm">Admin panel</span></a>}
        <a className="mini" href="#/book" title="Public booking" aria-label="Public booking"><Globe size={14} /><span className="hide-sm">Public booking</span></a>
        {me.role === 'dentist' && <button className="mini primary ask-era" onClick={onChat}><MessageCircle size={14} /> Ask Era</button>}
      </div>

      <div className="pagehead">
        <div>
          <span className="dashboard-eyebrow">{pageCopy.eyebrow}</span>
          <h2 className="ref-pagehead-title">{pageCopy.title}</h2>
          <p className="muted">{pageCopy.description}</p>
        </div>
        {me.role === 'dentist' && <div className="dashboard-actions">
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
              {statusCounts.scheduled > 0
                ? <span className="stat-trend stat-trend--info"><span className="stat-trend__arrow" aria-hidden="true">↑</span>{statusCounts.scheduled} still to see</span>
                : <span className="stat-trend stat-trend--flat">{appts.length ? 'day wrapped up' : 'nothing booked yet'}</span>}
            </div>
          </div>
          <div className="stat stat--mint">
            <span className="stat-icon stat-icon--green" aria-hidden="true"><Clock size={20} /></span>
            <div className="stat-body">
              <span className="statlabel">{date === today() ? 'COMPLETED TODAY' : 'COMPLETED'}</span>
              <span className="statnum">{String(doneToday).padStart(2, '0')}</span>
              <span className="stat-foot">{appts.length ? `of ${appts.length} booked` : 'nothing booked yet'}</span>
              {statusCounts.no_show > 0
                ? <span className="stat-trend stat-trend--down"><span className="stat-trend__arrow" aria-hidden="true">↓</span>{statusCounts.no_show} no-show{statusCounts.no_show === 1 ? '' : 's'}</span>
                : <span className="stat-trend stat-trend--up"><span className="stat-trend__arrow" aria-hidden="true">↑</span>kept on schedule</span>}
            </div>
          </div>
          <div className="stat stat--teal">
            <span className="stat-icon stat-icon--teal" aria-hidden="true"><Users size={20} /></span>
            <div className="stat-body">
              <span className="statlabel">TOTAL PATIENTS</span>
              <span className="statnum">{patientTotal}+</span>
              <span className="stat-foot">in your register</span>
              {invoices.length > 0
                ? <span className="stat-trend stat-trend--down"><span className="stat-trend__arrow" aria-hidden="true">↓</span>{money(due)} outstanding</span>
                : <span className="stat-trend stat-trend--up"><span className="stat-trend__arrow" aria-hidden="true">↑</span>all invoices settled</span>}
            </div>
          </div>
        </div>

        {/* clinic at a glance — four compact tiles that reflow 4 → 2 → 1 */}
        <div className="ref-glance dashboard-glance">
          <div>
            <small>APPOINTMENTS TODAY</small>
            <b>{appts.length}</b>
            <span className="muted">{statusCounts.scheduled} still scheduled</span>
          </div>
          <div>
            <small>COMPLETED</small>
            <b>{doneToday}</b>
            <span className="muted">of {appts.length} booked</span>
          </div>
          <div>
            <small>REGISTERED PATIENTS</small>
            <b>{patientTotal}</b>
            <span className="muted">searchable by name or phone</span>
          </div>
          <div>
            <small>UNPAID INVOICES</small>
            <b>{money(due)}</b>
            <span className="muted">{invoices.length} to follow up</span>
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

      {bookOpen && (activeSection === 'overview' || activeSection === 'appointments') && me.role === 'dentist' && (
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
                  <label className="dash-field dbk-doc">Doctor name<input value={me.name} readOnly disabled title="Appointments are booked under your signed-in account" /></label>
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

      {addOpen && (activeSection === 'overview' || activeSection === 'patients') && me.role === 'dentist' && (
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

      {activeSection !== 'billing' && <div className={`grid2 dashboard-panels${activeSection === 'overview' ? '' : ' dashboard-panels--single'}`}>
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
      <nav className="dash-bottomnav" aria-label="Mobile navigation">
        <button type="button" className={activeSection === 'overview' ? 'dash-bottomnav__btn is-on' : 'dash-bottomnav__btn'} onClick={() => { setActiveSection('overview'); setSideOpen(false) }} aria-current={activeSection === 'overview' ? 'page' : undefined}>
          <Home size={18} />
          <span>Home</span>
        </button>
        <button type="button" className={activeSection === 'appointments' ? 'dash-bottomnav__btn is-on' : 'dash-bottomnav__btn'} onClick={() => { setActiveSection('appointments'); setSideOpen(false) }} aria-current={activeSection === 'appointments' ? 'page' : undefined}>
          <CalendarCheck size={18} />
          <span>Appointments</span>
        </button>
        <button type="button" className={activeSection === 'patients' ? 'dash-bottomnav__btn is-on' : 'dash-bottomnav__btn'} onClick={() => { setActiveSection('patients'); setSideOpen(false) }} aria-current={activeSection === 'patients' ? 'page' : undefined}>
          <UserRound size={18} />
          <span>Patients</span>
        </button>
        <button type="button" className={activeSection === 'billing' ? 'dash-bottomnav__btn is-on' : 'dash-bottomnav__btn'} onClick={() => { setActiveSection('billing'); setSideOpen(false) }} aria-current={activeSection === 'billing' ? 'page' : undefined}>
          <IndianRupee size={18} />
          <span>Billing</span>
        </button>
        <button type="button" className={'dash-bottomnav__btn dash-bottomnav__btn--profile' + (profileOpen ? ' is-on' : '')} onClick={() => setProfileOpen(o => !o)} aria-expanded={profileOpen} aria-haspopup="dialog" aria-label={profileOpen ? 'Close profile' : 'Open profile'}>
          <span className="dash-bottomnav__avatar" aria-hidden="true"><img src={doctorPhoto(me.id)} alt="" /></span>
          <span>Profile</span>
        </button>
      </nav>

      {/* profile sheet — doctor photo + what they're known for; opens from the
          bottom-nav Profile button (phones) or the sidebar profile card (desktop) */}
      {profileOpen && <>
        <div className="dash-scrim dash-scrim--profile" onClick={() => setProfileOpen(false)} aria-hidden="true" />
        <section className="dash-profile" role="dialog" aria-label={`Profile — ${me.name}`}>
          <button type="button" className="dash-profile__close" onClick={() => setProfileOpen(false)} aria-label="Close profile">
            <XMark size={16} />
          </button>
          <img className="dash-profile__photo" src={doctorPhoto(me.id)} alt={`Photo of ${me.name}`} />
          <h3>{me.name}</h3>
          <small className="dash-profile__meta">{me.role === 'dentist' ? 'Dentist' : 'Clinic admin'}</small>
          <span className="dash-profile__chip">{me.specialty || 'Dental care'}</span>
          <p className="dash-profile__about">
            <b>Known for:</b> {famousFor(me.specialty)}
          </p>
          <button type="button" className="ref-signout" onClick={() => { setProfileOpen(false); logout() }}>
            <LogOut size={16} /> Sign out
          </button>
        </section>
      </>}
    </div>
  )
}
