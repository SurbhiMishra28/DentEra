// theme.js — dark mode without a library: a data-theme attribute on <html> plus
// localStorage. The follow-system choice is only the initial default; the toggle wins after.
const KEY = 'dentera_theme'
const isDark = () => document.documentElement.dataset.theme === 'dark'
export function initTheme() {
  let saved = null
  try { saved = localStorage.getItem(KEY) } catch { /* private mode */ }
  const dark = saved ? saved === 'dark'
    : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = dark ? 'dark' : ''
}
export function toggleTheme() {
  const next = isDark() ? '' : 'dark'
  document.documentElement.dataset.theme = next
  try { localStorage.setItem(KEY, next || 'light') } catch { /* private mode */ }
  return next === 'dark'
}
