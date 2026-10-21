// components/Icons.jsx — shared stroke SVG icons (no emojis anywhere).
// Every icon inherits `currentColor`, sized via props (default 20px).
import React from "react"

const base = (props) => ({
  xmlns: "http://www.w3.org/2000/svg",
  width: props.size || 20,
  height: props.size || 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
})

export const Tooth = (p) => (
  <svg {...base(p)}>
    <path d="M12 3c-2.1 0-2.9.9-4.9.9-2.3 0-3.6 1.2-3.6 3.4 0 3.9 1.9 5.6 2.4 9.1.3 2.3 1 5.6 2.6 5.6 1.9 0 1.3-4.1 3-4.1s1.1 4.1 3 4.1c1.6 0 2.3-3.3 2.6-5.6.5-3.5 2.4-5.2 2.4-9.1 0-2.2-1.3-3.4-3.6-3.4C14.9 3.9 14.1 3 12 3z" />
  </svg>
)

export const Smile = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M8.4 14.3s1.4 1.9 3.6 1.9 3.6-1.9 3.6-1.9" />
    <path d="M9 9.6v.1M15 9.6v.1" strokeWidth="2.6" />
  </svg>
)

export const ShieldCheck = (p) => (
  <svg {...base(p)}>
    <path d="M12 3l7 2.7v5.5c0 4.6-2.9 7.9-7 9.8-4.1-1.9-7-5.2-7-9.8V5.7L12 3z" />
    <path d="M9 11.6l2 2 3.8-3.8" />
  </svg>
)

export const Sparkles = (p) => (
  <svg {...base(p)}>
    <path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8-4.8-1.7 4.8-1.7L12 3.5z" />
    <path d="M18.8 15.2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </svg>
)

export const Medal = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8.5" r="4.6" />
    <path d="M9.4 12.6L7.3 21l4.7-2.6L16.7 21l-2.1-8.4" />
  </svg>
)

export const Heart = (p) => (
  <svg {...base(p)}>
    <path d="M12 20.4S4.6 15.3 4.6 9.8C4.6 7 6.8 5 9.1 5c1.3 0 2.4.6 2.9 1.6C12.5 5.6 13.6 5 14.9 5c2.3 0 4.5 2 4.5 4.8 0 5.5-7.4 10.6-7.4 10.6z" />
  </svg>
)

export const Wallet = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="13" rx="2.6" />
    <path d="M16 12.5h5v3h-5a1.5 1.5 0 0 1 0-3z" />
    <path d="M3 9.2c0-1.8 1.4-3.2 3.2-3.2h11.6" />
  </svg>
)

export const Clock = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.2v5l3.2 2" />
  </svg>
)

export const Droplet = (p) => (
  <svg {...base(p)}>
    <path d="M12 3.4s6.2 6.4 6.2 10.3a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.4 12 3.4z" />
  </svg>
)

export const Users = (p) => (
  <svg {...base(p)}>
    <circle cx="9.5" cy="8" r="3.3" />
    <path d="M3.4 19.6c0-3.4 2.7-5.6 6.1-5.6s6.1 2.2 6.1 5.6" />
    <path d="M16 5.4a3.3 3.3 0 0 1 0 5.2" />
    <path d="M17.6 14.4c2 .8 3 2.5 3 5.2" />
  </svg>
)

export const Trophy = (p) => (
  <svg {...base(p)}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
    <path d="M8 5H5.2A2.8 2.8 0 0 0 8 8.4" />
    <path d="M16 5h2.8A2.8 2.8 0 0 1 16 8.4" />
    <path d="M12 13v4" />
    <path d="M8.5 21h7" />
    <path d="M12 17c-1.6 0-2.4 1.4-3.5 4M12 17c1.6 0 2.4 1.4 3.5 4" />
  </svg>
)

export const MapPin = (p) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.5-5.7-6.5-10.4a6.5 6.5 0 1 1 13 0C18.5 15.3 12 21 12 21z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </svg>
)

export const Phone = (p) => (
  <svg {...base(p)}>
    <path d="M6.6 3h3l1.5 4.6-2.1 1.6a12.4 12.4 0 0 0 5.9 5.9l1.6-2.1L21 14.4v3a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3z" />
  </svg>
)

export const Mail = (p) => (
  <svg {...base(p)}>
    <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.4" />
    <path d="M4.4 7.4l7.6 5.6 7.6-5.6" />
  </svg>
)

export const Calendar = (p) => (
  <svg {...base(p)}>
    <rect x="3.6" y="5" width="16.8" height="15.4" rx="2.2" />
    <path d="M8 3v4M16 3v4M3.6 10.4h16.8" />
  </svg>
)

export const CalendarCheck = (p) => (
  <svg {...base(p)}>
    <rect x="3.6" y="5" width="16.8" height="15.4" rx="2.2" />
    <path d="M8 3v4M16 3v4M3.6 10.4h16.8" />
    <path d="M9.3 15.2l1.9 1.9 3.6-3.6" />
  </svg>
)

export const Home = (p) => (
  <svg {...base(p)}>
    <path d="M4 11.2L12 4l8 7.2" />
    <path d="M6 9.6V20h12V9.6" />
    <path d="M10 20v-5.4h4V20" />
  </svg>
)

export const LayoutGrid = (p) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </svg>
)

export const UserRound = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8.2" r="3.9" />
    <path d="M4.8 20.4c1.4-3.4 4.2-5 7.2-5s5.8 1.6 7.2 5" />
  </svg>
)

export const IndianRupee = (p) => (
  <svg {...base(p)}>
    <path d="M6.5 3.5h11M6.5 8h11" />
    <path d="M6.5 13h3" />
    <path d="M6.5 13c5.8 0 5.8-9.5 0-9.5" />
    <path d="M6.5 13l7.5 7.5" />
  </svg>
)

export const Plus = (p) => (
  <svg {...base(p)}>
    <path d="M12 5.5v13M5.5 12h13" />
  </svg>
)

export const Check = (p) => (
  <svg {...base(p)}>
    <path d="M5 12.8l4.6 4.6L19 6.6" />
  </svg>
)

export const XMark = (p) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const RotateCcw = (p) => (
  <svg {...base(p)}>
    <path d="M3.2 4.4v5.6h5.6" />
    <path d="M3.8 13.6a8.6 8.6 0 1 0 1.9-6.9L3.2 10" />
  </svg>
)

export const Search = (p) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.8" />
    <path d="M16.2 16.2L21 21" />
  </svg>
)

export const MessageCircle = (p) => (
  <svg {...base(p)}>
    <path d="M12 3.2a8.8 8.8 0 0 0-8.8 8.8c0 1.6.4 3.1 1.2 4.4L3.4 20.6l4.4-1.1A8.8 8.8 0 1 0 12 3.2z" />
  </svg>
)

export const Shield = (p) => (
  <svg {...base(p)}>
    <path d="M12 3l7 2.7v5.5c0 4.6-2.9 7.9-7 9.8-4.1-1.9-7-5.2-7-9.8V5.7L12 3z" />
  </svg>
)

export const AlertTriangle = (p) => (
  <svg {...base(p)}>
    <path d="M12 4.2L21.2 20H2.8L12 4.2z" />
    <path d="M12 10.2v4" />
    <path d="M12 16.9v.1" strokeWidth="2.6" />
  </svg>
)

export const ChevronRight = (p) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export const ChevronDown = (p) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const Stethoscope = (p) => (
  <svg {...base(p)}>
    <path d="M5 3.5v4.7a4.5 4.5 0 0 0 9 0V3.5" />
    <path d="M9.5 12.7v2.3a4.5 4.5 0 0 0 9 0v-2" />
    <circle cx="18.5" cy="9.5" r="2.2" />
  </svg>
)

export const Mic = (p) => (
  <svg {...base(p)}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5v3.5" />
    <path d="M8.5 21h7" />
  </svg>
)

export const Volume2 = (p) => (
  <svg {...base(p)}>
    <path d="M11 4.8L6.5 8.6H3.6v6.8h2.9l4.5 3.8V4.8z" />
    <path d="M15.4 9a4.4 4.4 0 0 1 0 6" />
    <path d="M18 6.6a8 8 0 0 1 0 10.8" />
  </svg>
)

export const VolumeX = (p) => (
  <svg {...base(p)}>
    <path d="M11 4.8L6.5 8.6H3.6v6.8h2.9l4.5 3.8V4.8z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </svg>
)

export const Lock = (p) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.4" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <path d="M12 15v2" />
  </svg>
)

export const Globe = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M3.6 12h16.8" />
    <path d="M12 3.4c2.4 2.3 3.6 5.2 3.6 8.6s-1.2 6.3-3.6 8.6c-2.4-2.3-3.6-5.2-3.6-8.6S9.6 5.7 12 3.4z" />
  </svg>
)

export const ClipboardList = (p) => (
  <svg {...base(p)}>
    <rect x="5" y="4.5" width="14" height="16.5" rx="2.2" />
    <path d="M9 3.2c0-.9.7-1.7 1.6-1.7h2.8c.9 0 1.6.8 1.6 1.7v1.3H9V3.2z" />
    <path d="M9 10h6M9 13.5h6M9 17h4" />
  </svg>
)

export const LogOut = (p) => (
  <svg {...base(p)}>
    <path d="M14 4h4.2A1.8 1.8 0 0 1 20 5.8v12.4a1.8 1.8 0 0 1-1.8 1.8H14" />
    <path d="M9.5 8L5.5 12l4 4" />
    <path d="M5.5 12H15" />
  </svg>
)

export const PieChart = (p) => (
  <svg {...base(p)}>
    <path d="M12 3.6A8.4 8.4 0 1 0 20.4 12H12V3.6z" />
    <path d="M15 3.9A8.44 8.44 0 0 1 20.1 9H15V3.9z" />
  </svg>
)

export const BarChart = (p) => (
  <svg {...base(p)}>
    <path d="M5 20v-8M12 20V5M19 20v-5" />
  </svg>
)

export const Bell = (p) => (
  <svg {...base(p)}>
    <path d="M18 15.2V10a6 6 0 1 0-12 0v5.2L4.4 17.6a.6.6 0 0 0 .5 1h14.2a.6.6 0 0 0 .5-1L18 15.2z" />
    <path d="M9.8 20.5a2.4 2.4 0 0 0 4.4 0" />
  </svg>
)

export const Menu = (p) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
)

export const Gear = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M12 2.8l.9 2.6c.9.2 1.7.6 2.4 1.1l2.6-1 2 3.4-1.9 1.9a7.6 7.6 0 0 1 0 2.4l1.9 1.9-2 3.4-2.6-1c-.7.5-1.5.9-2.4 1.1L12 21.2l-.9-2.6a7.6 7.6 0 0 1-2.4-1.1l-2.6 1-2-3.4 1.9-1.9a7.6 7.6 0 0 1 0-2.4L4.1 8.9l2-3.4 2.6 1c.7-.5 1.5-.9 2.4-1.1L12 2.8z" />
  </svg>
)
