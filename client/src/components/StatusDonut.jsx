import React from 'react'

export const STATUS_ORDER = ['scheduled', 'completed', 'no_show', 'cancelled']
export const STATUS_META = {
  scheduled: { label: 'Scheduled', color: '#0ea5e9' },
  completed: { label: 'Completed', color: '#22c55e' },
  no_show: { label: 'No-show', color: '#f59e0b' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
}

/* StatusDonut — pure SVG, no chart library. Segments = appointment status split. */
export default function StatusDonut({ counts, total, caption = 'appointments' }) {
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  const segs = total
    ? STATUS_ORDER.map(k => { const frac = (counts[k] || 0) / total; const seg = { k, frac, offset: acc }; acc += frac; return seg })
      .filter(s => s.frac > 0)
    : []
  return (
    <svg viewBox="0 0 140 140" className="ref-donut" role="img" aria-label={`Appointment status split — ${total} ${caption}`}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#eef1f6" strokeWidth="16" />
      {segs.map(s => (
        <circle key={s.k} cx="70" cy="70" r={R} fill="none" stroke={STATUS_META[s.k].color} strokeWidth="16"
          strokeDasharray={`${s.frac * C} ${C - s.frac * C}`} strokeDashoffset={-s.offset * C}
          transform="rotate(-90 70 70)" />
      ))}
      <text x="70" y="68" textAnchor="middle" className="ref-donut-num">{total}</text>
      <text x="70" y="88" textAnchor="middle" className="ref-donut-cap">{caption}</text>
    </svg>
  )
}
