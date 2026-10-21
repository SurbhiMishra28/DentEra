import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './dark.css'
import { initTheme } from './theme.js'

initTheme()

createRoot(document.getElementById('root')).render(<App />)

// PWA: register the service worker once the page is idle (never on http://localhost in prod terms
// not required — SW checks its own scope; production https:// is automatic)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is best-effort */ })
  })
}
