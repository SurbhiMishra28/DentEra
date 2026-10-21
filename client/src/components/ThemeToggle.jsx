import React, { useState } from 'react'
import { Moon, Sun } from './Icons.jsx'
import { toggleTheme } from '../theme.js'

// Light/dark switch. The initial theme comes from initTheme() (saved choice, else system).
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  return (
    <button className="mini themebtn" aria-pressed={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setDark(toggleTheme())}>
      {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? 'Light' : 'Dark'}
    </button>
  )
}
