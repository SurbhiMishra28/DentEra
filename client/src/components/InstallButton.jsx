// components/InstallButton.jsx — small toolbar pill that only renders while the
// browser is offering the install prompt (see utils/pwaInstall.js).
import React from "react"
import { usePwaInstall } from "../utils/pwaInstall.js"
import { Download } from "./Icons.jsx"

export default function InstallButton({ className = "mini", label = "Install app" }) {
  const { canInstall, install } = usePwaInstall()
  if (!canInstall) return null
  return (
    <button type="button" className={className} onClick={install} title={label} aria-label={label}>
      <Download size={14} />
      <span className="hide-sm">{label}</span>
    </button>
  )
}
