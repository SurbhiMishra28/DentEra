import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { Bell } from './Icons.jsx'

// Notifications bell — live via SSE (/api/stream), with a 60s polling fallback so a
// dropped connection degrades to "eventually" instead of "never". Any signed-in staff
// role sees the same feed; mark-read is per notification or all at once.
export default function Notifications() {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    let live = true
    const load = async () => {
      const { data } = await api.get('/api/notifications').catch(() => ({ data: {} }))
      if (!live) return
      setItems(data.data || [])
      setUnread(data.unread || 0)
    }
    load()
    // SSE stream (cookies ride along; reconnect is automatic in the browser)
    let es = null
    try {
      es = new EventSource('/api/stream')
      es.onmessage = e => {
        try {
          const n = JSON.parse(e.data)
          if (!live) return
          setItems(list => [n, ...list].slice(0, 30))
          setUnread(u => u + 1)
        } catch { /* keep-alive or odd frame */ }
      }
      es.onerror = () => { /* browser reconnects on its own */ }
    } catch { /* EventSource unsupported */ }
    const poll = setInterval(load, 60000)
    const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => { live = false; clearInterval(poll); es && es.close(); document.removeEventListener('click', onDoc) }
  }, [])

  async function markRead(id) {
    await api.post('/api/notifications/read', id ? { id } : {})
    setItems(list => list.map(n => n.id === id ? { ...n, read_at: 'now' } : n))
    if (id) setUnread(u => Math.max(0, u - 1)); else { setUnread(0); setItems(list => list.map(n => ({ ...n, read_at: n.read_at || 'now' }))) }
  }

  return (
    <span className="bellwrap" ref={boxRef}>
      <button className="mini bellbtn" aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        <Bell size={14} /> {unread > 0 && <b className="belldot">{unread > 9 ? '9+' : unread}</b>}
      </button>
      {open && (
        <div className="bellpop" role="dialog" aria-label="Notifications">
          <div className="bellpop__head">
            <b>Notifications</b>
            <button className="mini" onClick={() => markRead(null)}>Mark all read</button>
          </div>
          {items.length === 0 && <p className="empty">Nothing yet — new bookings, payments and reminders show up here.</p>}
          <ul className="list">
            {items.map(n => (
              <li key={n.id} className={n.read_at ? '' : 'is-unread'} onClick={() => !n.read_at && markRead(n.id)}>
                <span className="apptbody">
                  <b>{n.title}</b>
                  {n.body && <span className="muted"> — {n.body}</span>}
                  <span className="muted bellpop__time">{(n.created_at || '').replace('T', ' ').slice(11, 16)}</span>
                </span>
                {n.link && <a className="mini" href={n.link} onClick={e => e.stopPropagation()}>open</a>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  )
}
