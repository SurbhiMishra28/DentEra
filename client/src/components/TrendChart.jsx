import React from 'react'

const pad = n => String(n).padStart(2, '0')
const shortDay = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-IN', { weekday: 'short' }) }
const dayNum = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return ''
  return new Date(+m[1], +m[2] - 1, +m[3]).getDate() }

/* Daily trend as inline SVG — bars = money collected, dots = appointments.
   No chart library: the project stays dependency-light (same call as StatusDonut). */
export default function TrendChart({ data, height = 130 }) {
  const w = 720, h = height, padX = 26, padY = 14
  if (!data || !data.length) return <p className="empty">No data in this window yet.</p>
  const maxV = Math.max(1, ...data.map(d => Math.max(d.revenue, d.appointments)))
  const barW = (w - padX * 2) / data.length
  return (
    <svg className="trendsvg" viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label="Money collected per day, with appointment markers" preserveAspectRatio="none">
      {data.map((d, i) => {
        const rh = (d.revenue / maxV) * (h - padY * 2)
        const x = padX + i * barW
        return (
          <g key={d.date}>
            <rect x={x + barW * 0.15} y={padY + (h - padY * 2 - rh)} width={barW * 0.7} height={Math.max(rh, d.revenue > 0 ? 2 : 0)}
              rx="3" fill="url(#revGrad)" />
            {d.appointments > 0 && (
              <circle cx={x + barW * 0.5} cy={padY + (h - padY * 2) - (d.appointments / maxV) * (h - padY * 2) - 4}
                r="2.6" fill="var(--mint)" />
            )}
            <text x={x + barW * 0.5} y={h - 2} textAnchor="middle" className="trendsvg__label">
              {shortDay(d.date)[0]}{dayNum(d.date) ? ' ' + dayNum(d.date) : ''}
            </text>
          </g>
        )
      })}
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mint)" stopOpacity=".9" />
          <stop offset="100%" stopColor="var(--mint2)" stopOpacity=".35" />
        </linearGradient>
      </defs>
    </svg>
  )
}
