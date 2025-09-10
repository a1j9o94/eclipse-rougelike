export function isDebugOn(): boolean {
  try {
    // Enable via: window.DEBUG_COMBAT = true, or localStorage, or ?debug-combat
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = (globalThis as any) || {}
    if (w.DEBUG_COMBAT === true) return true
    if (typeof location !== 'undefined') {
      const qs = new URLSearchParams(location.search)
      if (qs.has('debug-combat')) return true
    }
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('FF_DEBUG_COMBAT') === '1') return true
    }
  } catch { /* ignore */ }
  return false
}

export function dlog(...args: unknown[]) {
  if (!isDebugOn()) return
  try { console.debug('[combat]', ...args) } catch { /* ignore */ }
}

