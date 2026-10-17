import React from 'react'
import { RotateCcw } from './Icons.jsx'

// ErrorBoundary — one UI crash must never white-screen the whole app (the admin
// stat-icon bug taught us this). Renders a friendly recovery card instead.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) { console.error('[dentera] UI crash:', err, info?.componentStack || '') }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="center" style={{ padding: '2rem', textAlign: 'center' }}>
        <span className="brand-mark" style={{ width: 52, height: 52, fontSize: 20 }} aria-hidden="true">D</span>
        <h2 style={{ marginTop: '1rem' }}>Something went wrong on this page</h2>
        <p className="muted">Your clinic data is safe — the page just hit an unexpected error. Try reloading, or head back home.</p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', marginTop: '1.2rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => location.reload()}><RotateCcw size={14} /> Reload page</button>
          <button type="button" className="btn btn--ghost" onClick={() => { this.setState({ err: null }); location.hash = '#/' }}>Go home</button>
        </div>
      </div>
    )
  }
}
