import React from 'react'
import { Tooth } from '../components/Icons.jsx'

// NotFound — friendly 404 for unknown hash routes (instead of silently showing the dashboard).
export default function NotFound() {
  return (
    <div className="center" style={{ minHeight: '70vh', textAlign: 'center', padding: '2.5rem 1.2rem' }}>
      <span className="brand-mark" style={{ width: 56, height: 56, fontSize: 20 }} aria-hidden="true"><Tooth size={26} /></span>
      <h1 style={{ margin: '1.1rem 0 0', fontSize: 'clamp(2.2rem, 6vw, 3.2rem)', letterSpacing: '-.03em' }}>404</h1>
      <h2 style={{ marginTop: '.2rem' }}>Page not found</h2>
      <p className="muted" style={{ maxWidth: 420, margin: '.4rem auto 0' }}>
        The page you were looking for doesn't exist or has moved. Your clinic data is untouched.
      </p>
      <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', marginTop: '1.4rem', flexWrap: 'wrap' }}>
        <a className="btn" href="#/">Back to home</a>
        <a className="btn btn--ghost" href="#/book">Book online</a>
      </div>
    </div>
  )
}
