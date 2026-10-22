// utils/pwaInstall.js — one browser-level install-prompt store, many subscribers.
// `beforeinstallprompt` is a ONE-SHOT event: whoever shows it consumes it. A module
// store keeps every UI surface (floating card, toolbar pills) in sync about that.
import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'dentera-install-dismissed'

let promptEvent = null
let installed = false
let captured = false
const listeners = new Set()

function notify() { for (const listener of listeners) listener() }

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// remember once-per-page whether the user said "not now"
function isDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false } // storage can throw in private mode
}

function ensureCaptured() {
  if (captured) return
  captured = true
  installed ||= isStandalone()
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setEvent(e) })
  window.addEventListener('appinstalled', () => { setEvent(null); installed = true })
}

function setEvent(e) { promptEvent = e; notify() }

// call from any button: shows the native install dialog; resolves true if accepted
export async function showInstall() {
  if (!promptEvent) return false
  const event = promptEvent
  setEvent(null) // one-shot: hide every surface while the dialog is in flight
  event.prompt()
  try {
    const { outcome } = await event.userChoice
    return outcome === 'accepted'
  } catch { return false } // stale/aborted prompt — text-less surfaces simply stay hidden
}

export function dismissInstall() {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* best-effort */ }
  notify()
}

// Single shared hook: subscribes to the store, re-renders when eligibility changes.
export function usePwaInstall() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])
  useEffect(() => {
    ensureCaptured()
    refresh() // a prompt may have fired before this component mounted
    listeners.add(refresh)
    return () => { listeners.delete(refresh) }
  }, [refresh])
  return {
    canInstall: !!promptEvent && !installed && !isDismissed(),
    installed: isStandalone() || installed,
    install: showInstall,
    dismiss: dismissInstall,
  }
}
