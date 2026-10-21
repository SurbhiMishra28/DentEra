import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import DentEraMark from '../components/DentEraMark.jsx'
import {
  Tooth, CalendarCheck, IndianRupee, ClipboardList, XMark, Check, FileText,
  LogOut, Phone, Lock, AlertTriangle, RotateCcw,
} from '../components/Icons.jsx'
import './portal.css'

// Patient portal — sign in with the phone number on file (+ date of birth when we
// have it). Everything a patient needs: visits, bills, tooth records and files.
const last10 = p => (String(p || '').match(/\d/g) || []).join('').slice(-10)
const fmt12 = t => { const [h, m] = (t || '').split(':').map(Number); if (Number.isNaN(h)) return t || ''
  const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}` }
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const niceDay = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) }
const TOOTH_LABEL = { healthy: 'Healthy', decayed: 'Decayed', filled: 'Filled', root_canal: 'Root canal',
  crowned: 'Crowned', missing: 'Missing', implant: 'Implant' }
const METHODS = [['upi', 'UPI'], ['card', 'Card'], ['cash', 'Cash at clinic'], ['bank', 'Bank transfer']]

export default function Portal() {
  const [me, setMe] = useState(undefined) // undefined = checking, null = signed out
  const [patient, setPatient] = useState(null)
  const [appts, setAppts] = useState([])
  const [invoices, setInvoices] = useState([])
  const [plans, setPlans] = useState([])
  const [chart, setChart] = useState(null)
  const [docs, setDocs] = useState([])
  const [form, setForm] = useState({ phone: '', dob: '' })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [payFor, setPayFor] = useState(null) // invoice id being paid
  const [payForm, setPayForm] = useState({ amount: '', method: 'upi', reference: '' })
  const [section, setSection] = useState('visits')

  async function load() {
    const [a, i, p, c, d] = await Promise.all([
      api.get('/api/portal/appointments'), api.get('/api/portal/invoices'), api.get('/api/portal/plans'),
      api.get('/api/portal/chart'), api.get('/api/portal/documents')])
    setAppts(a.data.data || []); setInvoices(i.data.data || []); setPlans(p.data.data || [])
    setChart(c.data.data || null); setDocs(d.data.data || [])
  }

  useEffect(() => {
    let live = true
    api.get('/api/portal/me').then(({ status, data }) => {
      if (!live) return
      if (status === 200) { setMe(true); setPatient(data.data); load() }
      else { setMe(null) }
    }).catch(() => { if (live) setMe(null) })
    return () => { live = false }
  }, [])

  async function signIn(e) {
    e.preventDefault(); setErr(''); setBusy(true)
    const digits = last10(form.phone)
    if (digits.length < 7) { setErr('Please enter the phone number the clinic has on file.'); setBusy(false); return }
    const { status, data } = await api.post('/api/portal/login', { phone: form.phone, dob: form.dob || undefined })
    setBusy(false)
    if (status === 200) { setMe(true); setPatient(data.patient); await load() }
    else setErr(data.message || 'Could not sign you in. Please check the details.')
  }

  async function signOut() { await api.post('/api/portal/logout'); setMe(null); setPatient(null); setAppts([]) }

  async function cancelVisit(id) {
    const { status, data } = await api.post(`/api/portal/appointments/${id}/cancel`, {})
    setMsg(status === 200 ? 'Visit cancelled — call the clinic to rebook.' : (data.message || 'Could not cancel.'))
    load()
  }

  async function pay(e) {
    e.preventDefault(); setMsg('')
    const inv = invoices.find(i => i.id === payFor) || {}
    const amount = Math.round(+payForm.amount || (inv.amount - inv.discount - inv.paid_amount))
    const { status, data } = await api.post(`/api/portal/invoices/${payFor}/payments`, {
      amount, method: payForm.method, reference: payForm.reference || undefined })
    setMsg(status === 201
      ? `Payment of ${money(data.data.amount)} recorded — invoice is now ${data.data.status}.`
      : (data.message || 'Could not record the payment.'))
    if (status === 201) { setPayFor(null); setPayForm(f => ({ ...f, amount: '', reference: '' })); load() }
  }

  // ---------- signed out → sign-in card ----------
  if (me === null) return (
    <div className="view portalview">
      <div className="topbar">
        <span className="brand"><span className="brand-mark"><DentEraMark /></span> DentEra</span>
        <span className="spacer" />
        <a className="mini" href="#/">Home</a>
        <a className="mini" href="#/book">Book a visit</a>
      </div>
      <div className="portallogin panel">
        <div className="portallogin__head">
          <span className="portallogin__icon" aria-hidden="true"><Tooth size={26} /></span>
          <div><h2>Patient portal</h2><p className="muted">See your visits, bills and tooth records.</p></div>
        </div>
        <form onSubmit={signIn} aria-label="Patient sign in">
          <label>Phone number the clinic has on file
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              type="tel" placeholder="e.g. 9810022222" pattern="[0-9+\-\s]{7,15}" required autoComplete="tel" />
          </label>
          <label>Date of birth <small>(only if the clinic has it on file)</small>
            <input value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} type="date" autoComplete="bday" />
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <button type="submit" disabled={busy}><Lock size={15} /> {busy ? 'Checking…' : 'See my records'}</button>
        </form>
        <p className="portallogin__note">No password to remember — your phone number (plus date of birth when we have it) is your key.
          First visit? <a href="#/book">Book online</a> and the clinic adds you to the register.</p>
      </div>
    </div>
  )

  if (me === undefined || !patient) return <div className="view center">Loading…</div>

  const upcoming = appts.filter(a => a.appointment_date >= isoOf(new Date()) && a.status === 'scheduled')
  const past = appts.filter(a => !(a.appointment_date >= isoOf(new Date()) && a.status === 'scheduled'))
  const due = invoices.reduce((s, i) => s + (i.amount - i.discount - i.paid_amount), 0)
  const byTooth = {}
  for (const r of (chart?.records || [])) byTooth[r.tooth_fdi] = r // records come oldest→newest
  const NAV = [['visits', 'Visits', CalendarCheck], ['billing', 'Bills', IndianRupee],
    ['records', 'Tooth records', ClipboardList], ['files', 'Files', FileText]]

  return (
    <div className="view portalview">
      <div className="topbar">
        <span className="brand"><span className="brand-mark"><DentEraMark /></span> DentEra</span>
        <span className="who">{patient.name}</span>
        <span className="spacer" />
        <a className="mini" href="#/book">Book a visit</a>
        <button className="mini" onClick={signOut}><LogOut size={13} /> Sign out</button>
      </div>

      <div className="pagehead">
        <div>
          <span className="dashboard-eyebrow">PATIENT PORTAL</span>
          <h2 className="ref-pagehead-title">Welcome back, {patient.name.split(' ')[0]}</h2>
          <p className="muted">{upcoming.length ? `Your next visit is ${niceDay(upcoming[0].appointment_date)} at ${fmt12(upcoming[0].start_time)} with ${upcoming[0].dentist}.` : 'No upcoming visits — book one whenever you need us.'}</p>
        </div>
        {patient.medical_notes && <span className="pill warnpill"><AlertTriangle size={12} /> {patient.medical_notes}</span>}
      </div>
      {msg && <p className="authmsg ok" role="status" aria-live="polite">{msg}</p>}

      <nav className="portalnav" aria-label="Portal sections">
        {NAV.map(([id, label, Icon]) => (
          <button key={id} type="button" className={section === id ? 'is-active' : ''}
            aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>
            <span aria-hidden="true"><Icon size={16} /></span>{label}
          </button>
        ))}
      </nav>

      {section === 'visits' && (
        <div className="grid2">
          <section className="panel">
            <h3>Upcoming visits</h3>
            {upcoming.length === 0 && <p className="empty"><CalendarCheck size={20} /> No upcoming visits.</p>}
            <ul className="list">
              {upcoming.map(a => (
                <li key={a.id} className="appt">
                  <span className="timechip">{niceDay(a.appointment_date)}<small>{fmt12(a.start_time)}</small></span>
                  <span className="apptbody">
                    <b>{a.dentist}</b>{a.source === 'public' && <span className="badge">online</span>}
                    <span className="muted"> — {a.reason || 'Consultation'} · {fmt12(a.start_time)}–{fmt12(a.end_time)}</span>
                  </span>
                  <span className="rowgap">
                    <button className="mini mini--danger" onClick={() => cancelVisit(a.id)}><XMark size={13} /> cancel</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h3>Visit history</h3>
            {past.length === 0 && <p className="empty"><RotateCcw size={20} /> No past visits yet.</p>}
            <ul className="list">
              {past.map(a => (
                <li key={a.id} className="appt">
                  <span className="timechip">{niceDay(a.appointment_date)}<small>{fmt12(a.start_time)}</small></span>
                  <span className="apptbody">
                    <b>{a.dentist}</b>
                    <span className="muted"> — {a.reason || 'Consultation'}</span>
                  </span>
                  <span className={'stchip st-' + a.status}>{a.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {section === 'billing' && (
        <section className="panel portal-billing">
          <div className="panelhead">
            <div><span className="panel-eyebrow">BILLS</span><h3>Invoices</h3></div>
            <span className="billing-total">{money(due)} <small>outstanding</small></span>
          </div>
          {invoices.length === 0 && <p className="empty"><IndianRupee size={20} /> No invoices yet.</p>}
          <ul className="list">
            {invoices.map(i => {
              const left = i.amount - i.discount - i.paid_amount
              return (
                <li key={i.id} className="invrow">
                  <span>
                    <b>#{i.id}</b> {money(i.amount)}{i.discount ? ` − ${money(i.discount)}` : ''} · paid {money(i.paid_amount)}
                    <span className={'stchip st-' + i.status} style={{ marginLeft: 8 }}>{i.status}</span>
                  </span>
                  <span className="rowgap">
                    {left > 0 && <button className="mini mini--ok" onClick={() => {
                      setPayFor(i.id); setPayForm({ amount: String(left), method: 'upi', reference: '' }); setMsg('')
                    }}><Check size={13} /> pay {money(left)}</button>}
                  </span>
                </li>
              )
            })}
          </ul>
          {payFor && (
            <form className="portalpay panel" onSubmit={pay} aria-label="Record a payment">
              <h4>Pay invoice #{payFor}</h4>
              <div className="grid3">
                <label>Amount <input value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} type="number" min="1" required /></label>
                <label>Method
                  <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                    {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label>Reference <small>(UPI ref / last 4 digits — optional)</small>
                  <input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} />
                </label>
              </div>
              <div className="rowgap">
                <button type="submit" className="btn"><Check size={15} /> Record payment</button>
                <button type="button" className="mini" onClick={() => setPayFor(null)}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      )}

      {section === 'records' && (
        <div className="grid2">
          <section className="panel">
            <h3>Tooth records</h3>
            {!chart?.records?.length && <p className="empty"><ClipboardList size={20} /> No tooth records yet.</p>}
            {!!chart?.records?.length && (
              <ul className="list">
                {Object.entries(byTooth).map(([fdi, r]) => (
                  <li key={fdi}>
                    <b>Tooth {fdi}</b> — {TOOTH_LABEL[r.tooth_status] || r.tooth_status}
                    {r.treatment_name ? ` · ${r.treatment_name}` : ''}
                    {r.visit_date ? <span className="muted"> · {r.visit_date}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <h3>Treatment plans</h3>
            {plans.length === 0 && <p className="empty"><ClipboardList size={20} /> No treatment plans yet.</p>}
            <ul className="list">
              {plans.map(p => (
                <li key={p.id}>
                  <b>#{p.id} {p.title}</b>
                  <span className="muted"> · {p.status} · est {money(p.total_estimate)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {section === 'files' && (
        <section className="panel">
          <h3>Files (X-rays & reports)</h3>
          <p className="muted" style={{ marginTop: 0 }}>Files your clinic shared with you.</p>
          {docs.length === 0 && <p className="empty"><FileText size={20} /> No files yet.</p>}
          <ul className="list">
            {docs.map(d => (
              <li key={d.id}>
                <FileText size={14} /> <b>{d.filename}</b>
                <span className="muted"> · {d.kind}{d.tooth_fdi ? ` · tooth ${d.tooth_fdi}` : ''} · {(d.bytes / 1024).toFixed(0)} KB</span>
                <a className="mini" href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer">open</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="tiny footnote"><Lock size={13} /> Your records stay private — only you and your clinic can see them. <Phone size={13} /> Call the clinic for anything urgent.</p>
    </div>
  )
}
