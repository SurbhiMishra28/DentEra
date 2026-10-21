import React, { useState } from 'react'
import { api } from '../api.js'
import DentEraMark from '../components/DentEraMark.jsx'
import { Check, Tooth, ChevronRight, Eye, EyeOff } from '../components/Icons.jsx'
import '../login.css'

const homeFor = u => (u && u.role === 'admin' ? '#/admin' : '#/dashboard')

export default function Login({ onDone }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('Signing you in…')
    try {
      const form = new FormData(e.currentTarget)
      const { status, data } = await api.post('/api/auth/login', {
        email: String(form.get('email') || '').trim(),
        password: String(form.get('password') || '')
      })
      if (status === 200 || status === 201) {
        onDone(data.user)
        location.hash = homeFor(data.user)
      } else {
        setMsg(data.message || 'Could not sign you in.')
      }
    } catch {
      setMsg('Unable to reach the clinic server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function demo(who) {
    setBusy(true)
    setMsg('Signing in with the demo account…')
    try {
      const { status, data } = await api.post('/api/auth/demo-login', { who })
      if (status === 200) {
        onDone(data.user)
        location.hash = homeFor(data.user)
      } else {
        setMsg(data.message || 'Demo login unavailable — please use the sign-in form.')
      }
    } catch {
      setMsg('Unable to reach the clinic server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <a className="login-brand" href="#/" aria-label="DentEra home">
          <span className="brand-mark"><DentEraMark /></span>
          <span>DentEra</span>
        </a>
        <nav className="login-header-links" aria-label="Sign-in navigation">
          <a className="login-home" href="#/portal">Patient portal</a>
          <a className="login-home" href="#/">Back to home</a>
        </nav>
      </header>

      <section className="login-layout" aria-label="Doctor sign in">
        <aside className="login-aside">
          <h1>Your clinic, in one place.</h1>
          <p>Appointments, patient charts, treatment plans and billing — from one workspace.</p>
          <ul>
            <li><span aria-hidden="true"><Check size={14} /></span> Appointments and patient records</li>
            <li><span aria-hidden="true"><Check size={14} /></span> Treatment plans and clinical charting</li>
            <li><span aria-hidden="true"><Check size={14} /></span> Billing and payment tracking</li>
          </ul>
        </aside>

        <div className="loginform">
          <h2 id="login-title">Doctor sign in</h2>
          <p className="sub">Only doctors and the clinic admin can sign in — accounts are pre-registered by the clinic.</p>
          <form onSubmit={submit} id="loginF">
            <label htmlFor="login-email">Email or username</label>
            <input id="login-email" name="email" type="text" placeholder="you@dental.local or admin" autoComplete="username" required />
            <label htmlFor="login-password">Password</label>
            <span className="pwfield">
              <input id="login-password" name="password" type={showPw ? 'text' : 'password'} placeholder="At least 4 characters" autoComplete="current-password" minLength={4} required />
              <button type="button" className="pwtoggle" aria-pressed={showPw}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                title={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
            <button disabled={busy} type="submit">{busy ? 'Please wait…' : 'Sign in'}</button>
          </form>
          <p className="authmsg" role="status" aria-live="polite">{msg}</p>

          <a className="portalcta" href="#/portal">
            <span className="portalcta__icon" aria-hidden="true"><Tooth size={20} /></span>
            <span className="portalcta__body">
              <b>I'm a patient</b>
              <small>See your visits, bills and tooth records — sign in with your phone number, no password.</small>
            </span>
            <span className="portalcta__go" aria-hidden="true"><ChevronRight size={16} /></span>
          </a>

          <div className="demobox">
            <span className="demolabel">Or explore a demo clinic — pick a doctor</span>
            <div className="demo-personas">
              <button type="button" className="demo-persona" disabled={busy} onClick={() => demo('dentistA')}>
                <img
                  src="/doctor-1.jpg"
                  alt=""
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/clinic-1.jpg" }}
                />
                <span><b>Dr. Meera Iyer</b><small>General Dentistry</small></span>
              </button>
              <button type="button" className="demo-persona" disabled={busy} onClick={() => demo('dentistB')}>
                <img
                  src="/doctor-2.jpg"
                  alt=""
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/dentist-1.jpg" }}
                />
                <span><b>Dr. Arjun Shah</b><small>Orthodontics</small></span>
              </button>
            </div>
          </div>

          <p className="login-privacy">Only the clinic's registered doctors and admin have accounts here.
            Patients sign in with their phone number in the <a href="#/portal">patient portal</a>.</p>
        </div>
      </section>
    </main>
  )
}
