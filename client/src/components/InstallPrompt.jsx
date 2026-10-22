// components/InstallPrompt.jsx — floating "add DentEra to your device" card.
// Mounted once in App.jsx so it works on the landing, dashboard and admin alike.
// Hidden while already installed, already dismissed, or while the browser
// has not offered the one-shot install prompt us.
import React from "react"
import { usePwaInstall } from "../utils/pwaInstall.js"
import DentEraMark from "./DentEraMark.jsx"
import { Download } from "./Icons.jsx"

export default function InstallPrompt() {
  const { canInstall, install, dismiss } = usePwaInstall()
  if (!canInstall) return null
  return (
    <div className="pwa-install-card" role="region" aria-label="Install the DentEra app">
      <span className="pwa-install-card__mark" aria-hidden="true"><DentEraMark /></span>
      <div className="pwa-install-card__body">
        <strong>Add DentEra to your device</strong>
        <p>One tap from your home screen — appointments, charts and Era, just like an app.</p>
      </div>
      <div className="pwa-install-card__actions">
        <button type="button" className="pwa-install-card__install" onClick={install}>
          <Download size={15} /> Install
        </button>
        <button type="button" className="pwa-install-card__later" onClick={dismiss}>Not now</button>
      </div>
    </div>
  )
}
