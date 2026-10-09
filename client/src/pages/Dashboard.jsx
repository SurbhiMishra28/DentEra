import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const fmt12 = t => { const [h, m] = (t || '').split(':').map(Number); if (Number.isNaN(h)) return t || ''
  const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}` }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const prettyDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) }
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const initial = n => (n || '?').replace(/^Dr\.?\s*/i, '').trim()[0]?.toUpperCase() || '?'

export default function Dashboard({ me, onChat, onLogout }) {
  const [appts, setAppts] = useState([])
  const [patients, setPatients] = useState([])
  const [patientTotal, setPatientTotal] = useState(0)
  const [invoices, setInvoices] = useState([])
  const [q, setQ] = useState('')
  const [date, setDate] = useState(today())

  useEffect(() => {
    let live = true
    async function load() {
      const [a, p, pt, i] = await Promise.all([
        api.get(`/api/appointments?date=${date}`), api.get(`/api/patients?q=${encodeURIComponent(q)}`),
        api.get('/api/patients?q='), api.get('/api/invoices?status=unpaid')])
      if (!live) return
      setAppts(a.data.data || []); setPatients(p.data.data || [])
      setPatientTotal((pt.data.data || []).length); setInvoices(i.data.data || [])
    }
    load(); const t = setInterval(load, 60000)
    return () => { live = false; clearInterval(t) }
  }, [date, q])

  async function logout() { await api.post('/api/auth/logout'); onLogout(); location.hash = '#/' }

  const due = invoices.reduce((s, i) => s + (i.amount - i.discount - i.paid_amount), 0)

  return (
    <div className="view">
      <div className="topbar">
        <span className="brand"><span className="brand-mark" aria-hidden="true">D</span> DentEra</span>
        <span className="doctor-identity">
          {me.role === 'dentist' && <span className="doctor-avatar" aria-hidden="true">{initial(me.name)}</span>}
          <span className="who">{me.name} · {me.role}{me.dentistId ? ` · dentist #${me.dentistId}` : ''}</span>
        </span>
        <span className="spacer" />
        {(me.role === 'admin' || me.role === 'reception') && <a className="mini" href="#/admin">🛡️ Admin panel</a>}
        <a className="mini" href="#/book">Public booking</a>
        {me.role === 'dentist' && <button className="mini primary ask-era" onClick={onChat}>💬 Ask Era</button>}
        <button className="mini" onClick={logout}>Sign out</button>
      </div>

      <div className="pagehead">
        <h1>{greet()}, {me.name.replace(/^Dr\.?\s*/i, 'Dr. ')} 👋</h1>
        <p className="muted">{prettyDate(date)} — here's your clinic today.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="statnum">{appts.length}</span><span className="statlabel">appointments · {date === today() ? 'today' : prettyDate(date)}</span></div>
        <div className="stat"><span className="statnum">{patientTotal}</span><span className="statlabel">patients in register</span></div>
        <div className={'stat' + (invoices.length ? ' warn' : '')}><span className="statnum">₹{due.toLocaleString('en-IN')}</span><span className="statlabel">unpaid · {invoices.length} invoice(s)</span></div>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="panelhead">
            <h3>Appointments</h3>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Appointment date" />
          </div>
          {appts.length === 0 && <p className="empty">No appointments this day — enjoy the quiet. ☕</p>}
          <ul className="list">
            {appts.map(a => (
              <li key={a.id} className="appt">
                <span className="timechip">{fmt12(a.start_time)}<br /><small>{fmt12(a.end_time)}</small></span>
                <span className="apptbody">
                  <b>{a.patient_name || 'Walk-in'}</b>
                  {a.source === 'public' && <span className="badge">public</span>}
                  <span className="muted"> — {a.reason || 'Consultation'}</span>
                </span>
                <span className={'stchip st-' + a.status}>{a.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panelhead"><h3>Patient register</h3></div>
          <input placeholder="Search name or phone…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search patients" />
          {patients.length === 0 && <p className="empty">No patients match “{q}”.</p>}
          <ul className="list">
            {patients.map(p => (
              <li key={p.id} className="ptrow">
                <span className="avatar" aria-hidden="true">{initial(p.name)}</span>
                <span className="apptbody">
                  <a href={`#/patients/${p.id}`}><b>{p.name}</b></a>
                  {p.medical_notes && <span className="warn" title={p.medical_notes}> ⚠️</span>}
                  <span className="muted"> {p.phone || ''}</span>
                </span>
                <a className="chev" href={`#/patients/${p.id}`} aria-label={`Open ${p.name}`}>›</a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
