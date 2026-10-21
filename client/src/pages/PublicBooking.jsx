import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Tooth, Sparkles, CalendarCheck, Lock, Search } from '../components/Icons.jsx'
import './publicbooking.css'

// Public booking — "Online Dental Appointment Form": plain clinic booking form.
// The API contract (pinned by tests) needs dentist_id + phone + a concrete free
// slot, so the form carries "Preferred dentist", "Preferred Appointment Date/Time"
// and a phone field; the intake answers (birth date, first visit, symptoms,
// recent hospital stay) are folded into the `reason` text the clinic sees.
const fmt12 = t => { const [h, m] = (t || '').split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}` }
const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const parts = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3]) }
const dateLabel = iso => { if (iso === plusDays(1)) return 'Tomorrow'
  const d = parts(iso); return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : iso }
const niceLong = iso => { const d = parts(iso); return d ? d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : iso }
// Dentist 1 (general) works Mon–Fri, Dentist 2 (ortho) Tue–Sat — the form must
// default to a day that at least one of them actually works.
const firstOpenDay = () => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() === 0) d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

const DENTISTS = [
  { id: 1, name: 'Dr. Meera Iyer', spec: 'General Dentistry' },
  { id: 2, name: 'Dr. Arjun Shah', spec: 'Orthodontics' }
]

export default function PublicBooking() {
  const [dentistId, setDentistId] = useState(1)
  const [date, setDate] = useState(firstOpenDay())
  const [slot, setSlot] = useState('') // '' = earliest available
  const [slots, setSlots] = useState([])
  const [slotMsg, setSlotMsg] = useState('')
  const [slotNonce, setSlotNonce] = useState(0) // bump to refetch after a 409 clash
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [trackPhone, setTrackPhone] = useState('')
  const [trackRes, setTrackRes] = useState(null)
  const [trackMsg, setTrackMsg] = useState('')
  const [trackBusy, setTrackBusy] = useState(false)

  useEffect(() => { fetch('/api/health').catch(() => {}) }, [])

  // free slots for the chosen dentist + date (Sunday needs no request — clinic is closed)
  useEffect(() => {
    let live = true
    setSlots([]); setSlot(''); setSlotMsg('')
    if (!dentistId || !date) return
    if (parts(date)?.getDay() === 0) { setSlotMsg('The clinic is closed on Sundays — please pick another day.'); return }
    api.get(`/api/public/slots?dentist=${dentistId}&date=${date}`).then(({ status, data }) => {
      if (!live) return
      if (status === 200) {
        setSlots(data.data || [])
        if (!(data.data || []).length) setSlotMsg('No free slots that day — please pick another date.')
      } else setSlotMsg(data.message || 'Could not load slots — please try again.')
    }).catch(() => { if (live) setSlotMsg('Could not load slots — please try again.') })
    return () => { live = false }
  }, [dentistId, date, slotNonce])

  async function track(e) {
    e.preventDefault(); setTrackMsg(''); setTrackRes(null); setTrackBusy(true)
    const { status, data } = await api.post('/api/public/track', { phone: trackPhone.trim() })
    setTrackBusy(false)
    if (status === 200) {
      setTrackRes(data.data || [])
      if (!(data.data || []).length) setTrackMsg('No upcoming bookings found for this number — book one above, or call the clinic.')
    } else setTrackMsg(data.message || 'Could not look up your booking.')
  }

  async function submit(e) {
    e.preventDefault(); setErr('')
    const fd = new FormData(e.target)
    const first = String(fd.get('fname') || '').trim(), last = String(fd.get('lname') || '').trim()
    const name = [first, last].filter(Boolean).join(' ')
    const birth = String(fd.get('birth') || '').trim()
    const phone = String(fd.get('phone') || '').trim()
    const yn = k => { const v = fd.get(k); return v ? (v === 'yes' ? 'Yes' : 'No') : '' }
    const time = slot || (slots[0] ? slots[0].time : '')
    if (!time) { setErr('No free slots on that date — please pick another day.'); return }
    setBusy(true)
    const email = f.email.value.trim(), address = f.address.value.trim()
    const bits = [
      birth && `Birth date: ${birth}`,
      yn('firstVisit') && `First visit: ${yn('firstVisit')}`,
      yn('fever') && `Fever 38+: ${yn('fever')}`,
      yn('vomiting') && `Vomiting: ${yn('vomiting')}`,
      yn('cough') && `Cough: ${yn('cough')}`,
      yn('discharged') && `Hospital last 14 days: ${yn('discharged')}`
    ].filter(Boolean)
    const reason = ['Website request', ...bits].join(' — ').slice(0, 200)
    const { status, data } = await api.post('/api/public/booking', {
      dentist_id: dentistId, date, time, name, phone, email, address, reason
    })
    setBusy(false)
    if (status === 201) setDone({ date, time, name, phone })
    else if (status === 409) { setErr(data.message || 'That slot was just taken — please pick another time.'); setSlotNonce(n => n + 1) }
    else setErr(data.message || 'Booking failed.')
  }

  return (
    <div className="bookview">
      <div className="topbar">
        <a className="mini" href="#/">← Home</a>
        <span className="brand"><Tooth size={20} /> DentEra</span>
        <span className="spacer" />
        <a className="mini" href="#/login">Doctor sign in</a>
      </div>

      {done ? (
        <div className="bookmain">
          <div className="panel center donecard">
            <div className="logo"><Sparkles size={34} /></div>
            <h2>Booked!</h2>
            <p className="donebig">See you <b>{done.date === plusDays(1) ? 'tomorrow' : niceLong(done.date)}</b> at <b>{fmt12(done.time)}</b>, {done.name}.</p>
            <p className="muted">Save your number ({done.phone}) — use "Track your booking" on the booking page anytime to double-check the slot. A confirmation call will follow.</p>
            <div className="hero-cta" style={{ justifyContent: 'center' }}>
              <a className="btn" href="#/">Back to home</a>
              <a className="btn ghost" href="#/book">Book another</a>
            </div>
          </div>
        </div>
      ) : (
        <div className="bookmain">
          <section className="medcard" aria-label="Online dental appointment form">
            <h1 className="medtitle">Online Dental Appointment Form</h1>

            <form onSubmit={submit} className="medgrid">
              <div className="medblock full">
                <span className="medlabel">Your name:</span>
                <div className="medpair">
                  <input className="medinput" name="fname" placeholder="First" required aria-label="First name" autoComplete="given-name" />
                  <input className="medinput" name="lname" placeholder="Last" aria-label="Last name" autoComplete="family-name" />
                </div>
              </div>

              <label className="medblock full">
                <span className="medlabel">Birth date:</span>
                <input className="medinput" name="birth" type="date" aria-label="Birth date" />
              </label>

              <div className="medblock full" role="radiogroup" aria-label="Is this your first visit?">
                <span className="medlabel">Is this your first visit:</span>
                <div className="medradios">
                  <label className="medradio"><input type="radio" name="firstVisit" value="yes" /> Yes</label>
                  <label className="medradio"><input type="radio" name="firstVisit" value="no" /> No</label>
                </div>
              </div>

              <label className="medblock full">
                <span className="medlabel">Name the doctor you want to visit:</span>
                <select className="medinput" value={dentistId} onChange={e => setDentistId(+e.target.value)} aria-label="Preferred dentist">
                  {DENTISTS.map(d => <option key={d.id} value={d.id}>{d.name} — {d.spec}</option>)}
                </select>
              </label>

              <div className="medblock full" role="group" aria-label="Do you have any of the below?">
                <span className="medlabel">Do you have any of the below:</span>
                <div className="medtable">
                  <span aria-hidden="true" />
                  <span className="medth">Yes</span>
                  <span className="medth">No</span>

                  <span className="medq">Fever 38° or greater:</span>
                  <label className="medcell"><input type="radio" name="fever" value="yes" aria-label="Fever — yes" /></label>
                  <label className="medcell"><input type="radio" name="fever" value="no" aria-label="Fever — no" /></label>

                  <span className="medq">Vomiting:</span>
                  <label className="medcell"><input type="radio" name="vomiting" value="yes" aria-label="Vomiting — yes" /></label>
                  <label className="medcell"><input type="radio" name="vomiting" value="no" aria-label="Vomiting — no" /></label>

                  <span className="medq">Cough:</span>
                  <label className="medcell"><input type="radio" name="cough" value="yes" aria-label="Cough — yes" /></label>
                  <label className="medcell"><input type="radio" name="cough" value="no" aria-label="Cough — no" /></label>
                </div>
              </div>

              <div className="medblock full" role="group" aria-label="Please answer the following">
                <span className="medlabel">Please answer the following:</span>
                <div className="medtable">
                  <span aria-hidden="true" />
                  <span className="medth">Yes</span>
                  <span className="medth">No</span>

                  <span className="medq">Have you been discharged from hospital in the last 14 days?</span>
                  <label className="medcell"><input type="radio" name="discharged" value="yes" aria-label="Discharged from hospital — yes" /></label>
                  <label className="medcell"><input type="radio" name="discharged" value="no" aria-label="Discharged from hospital — no" /></label>
                </div>
              </div>

              <label className="medblock full">
                <span className="medlabel">Preferred Appointment Date:</span>
                <input className="medinput" name="date" type="date" required
                  min={firstOpenDay()} max={plusDays(14)}
                  value={date} onChange={e => setDate(e.target.value)} aria-label="Preferred appointment date" />
              </label>

              <label className="medblock full">
                <span className="medlabel">Preferred Appointment Time:</span>
                <select className="medinput" value={slot} onChange={e => setSlot(e.target.value)}
                  disabled={!slots.length} aria-label="Preferred appointment time">
                  {slots.length
                    ? <option value="">Earliest available ({fmt12(slots[0].time)})</option>
                    : <option value="">{date ? 'No free slots — pick another date' : 'Pick a date first'}</option>}
                  {slots.map(s => <option key={s.time} value={s.time}>{fmt12(s.time)}</option>)}
                </select>
              </label>

              <label className="medblock full">
                <span className="medlabel">Your phone:</span>
                <input className="medinput" name="phone" type="tel" required
                  pattern="[0-9+\-\s]{7,15}" placeholder="e.g. 9810022223"
                  aria-label="Your phone" autoComplete="tel" />
              </label>

              {slotMsg && <p className="medhint full" role="status">{slotMsg}</p>}
              {err && <p className="err full">{err}</p>}

              <div className="medactions full">
                <button type="submit" className="medbtn" disabled={busy || (!!date && !slots.length)}>
                  <CalendarCheck size={17} /> {busy ? 'Scheduling…' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </section>

          <section className="medcard trackcard" aria-label="Track an existing booking">
            <h3 className="medtrackhead"><Search size={17} /> Track your booking</h3>
            <p className="medmuted">Already booked? Enter the phone number you used — we'll show your upcoming appointments.</p>
            <form onSubmit={track} className="medtrackform">
              <label className="medblock">
                <span className="medlabel">Phone:</span>
                <input className="medinput" value={trackPhone} onChange={e => setTrackPhone(e.target.value)}
                  placeholder="e.g. 9810022223" required pattern="[0-9+\-\s]{7,15}" />
              </label>
              <div>
                <button type="submit" className="medbtn ghost" disabled={trackBusy}>
                  {trackBusy ? 'Looking…' : 'Find my booking'}
                </button>
              </div>
            </form>
            {trackMsg && <p className="medmuted" role="status" style={{ margin: '0.9rem 0 0' }}>{trackMsg}</p>}
            {trackRes && trackRes.length > 0 && (
              <ul className="list" style={{ marginTop: '.9rem' }}>
                {trackRes.map((r, i) => (
                  <li key={i}>
                    <span className="timechip">{dateLabel(r.appointment_date)}<small>{fmt12(r.start_time)}</small></span>
                    <span className="apptbody">
                      <b>{r.patient_name}</b><br />
                      <span className="muted">{r.dentist} · {fmt12(r.start_time)}–{fmt12(r.end_time)}{r.reason ? ` · ${r.reason}` : ''}</span>
                    </span>
                    <span className={'stchip st-' + r.status}>{r.status.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="tiny footnote"><Lock size={13} /> Your details stay private — used only for this appointment.</p>
        </div>
      )}
    </div>
  )
}
