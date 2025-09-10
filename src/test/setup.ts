import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Always silence <audio> at runtime in tests
class SilentAudio {
  currentTime = 0;
  loop = false;
  play() { return Promise.resolve(); }
  pause() {}
}
;(globalThis as unknown as { Audio: typeof Audio }).Audio = SilentAudio as unknown as typeof Audio

// Limit pretty DOM output on failures to avoid huge memory spikes
try { (process as unknown as { env: Record<string,string> }).env.DEBUG_PRINT_LIMIT = (process.env.DEBUG_PRINT_LIMIT || '1000') } catch { void 0 }

// Track and clean up all timers to prevent late setState after teardown
const _timeouts = new Set<ReturnType<typeof setTimeout>>()
const _intervals = new Set<ReturnType<typeof setInterval>>()
const _ot = global.setTimeout
const _oi = global.setInterval
const _ct = global.clearTimeout
const _ci = global.clearInterval
// @ts-expect-error override global for tests
global.setTimeout = ((fn: Parameters<typeof setTimeout>[0], ms?: number, ...args: unknown[]) => {
  const id = _ot(fn as unknown as TimerHandler, ms as number, ...(args as unknown[]))
  _timeouts.add(id)
  return id
}) as typeof setTimeout
// @ts-expect-error override global for tests
global.setInterval = ((fn: Parameters<typeof setInterval>[0], ms?: number, ...args: unknown[]) => {
  const id = _oi(fn as unknown as TimerHandler, ms as number, ...(args as unknown[]))
  _intervals.add(id)
  return id
}) as typeof setInterval
// @ts-expect-error override global for tests
global.clearTimeout = ((id: ReturnType<typeof setTimeout>) => { _timeouts.delete(id); return _ct(id) }) as typeof clearTimeout
// @ts-expect-error override global for tests
global.clearInterval = ((id: ReturnType<typeof setInterval>) => { _intervals.delete(id); return _ci(id) }) as typeof clearInterval

// Global testing-library cleanup to ensure unmount and effect cleanup
afterEach(() => {
  cleanup()
  try { localStorage.clear() } catch { /* ignore */ void 0 }
  try { sessionStorage.clear() } catch { /* ignore */ void 0 }
  // Restore any spies/mocks between tests to avoid cross-test leakage
  vi.restoreAllMocks()
  // Clear any stray timers
  try { for (const id of _timeouts) _ct(id) } catch { void 0 }
  try { for (const id of _intervals) _ci(id) } catch { void 0 }
  _timeouts.clear(); _intervals.clear()
})

// Quiet noisy debug logs that cause huge outputs in CI
beforeEach(() => {
  // Only mock if not already mocked by a specific test
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isMocked = (console.debug as any)?.getMockName?.()
    if (!isMocked) vi.spyOn(console, 'debug').mockImplementation(() => {})
  } catch { /* ignore */ void 0 }
  try {
    const isWarnMocked = (console.warn as unknown as { getMockName?: () => string })?.getMockName?.()
    if (!isWarnMocked) vi.spyOn(console, 'warn').mockImplementation(() => {})
  } catch { /* ignore */ void 0 }
  try {
    const origError = console.error
    const isErrMocked = (console.error as unknown as { getMockName?: () => string })?.getMockName?.()
    if (!isErrMocked) vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const msg = String(args[0] ?? '')
      if (msg.includes('not wrapped in act')) return
      return (origError as unknown as (...a: unknown[]) => void)(...args)
    })
  } catch { /* ignore */ void 0 }
})
