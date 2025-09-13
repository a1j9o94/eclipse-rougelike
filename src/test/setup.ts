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

// jsdom doesn't implement canvas; stub getContext so components using <canvas> mount
try {
  const anyWindow = globalThis as unknown as { HTMLCanvasElement?: { prototype?: { getContext?: unknown } } }
  if (anyWindow?.HTMLCanvasElement) {
    anyWindow.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }), putImageData: () => {}, createImageData: () => [],
      setTransform: () => {}, drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {}, beginPath: () => {}, moveTo: () => {},
      lineTo: () => {}, closePath: () => {}, stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {}, arc: () => {}, fill: () => {},
      measureText: () => ({ width: 0 }), transform: () => {}, rect: () => {}, clip: () => {}, canvas: {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
    }) as unknown as (type: string) => unknown
  }
} catch { /* noop */ }

// Limit pretty DOM output on failures to avoid huge memory spikes
try { (process as unknown as { env: Record<string,string> }).env.DEBUG_PRINT_LIMIT = (process.env.DEBUG_PRINT_LIMIT || '1000') } catch { void 0 }

// Track and clean up all timers to prevent late setState after teardown
const _timeouts = new Set<ReturnType<typeof global.setTimeout>>()
const _intervals = new Set<ReturnType<typeof global.setInterval>>()
const _ot = global.setTimeout.bind(global) as typeof setTimeout
const _oi = global.setInterval.bind(global) as typeof setInterval
const _ct = global.clearTimeout.bind(global) as typeof clearTimeout
const _ci = global.clearInterval.bind(global) as typeof clearInterval
// Override globals; track ids using broad types to satisfy Node/browser
global.setTimeout = ((fn: Parameters<typeof setTimeout>[0], ms?: number, ...args: unknown[]) => {
  const id = _ot(fn as unknown as TimerHandler, ms as number, ...(args as unknown[])) as ReturnType<typeof global.setTimeout>
  _timeouts.add(id)
  return id as unknown as number
}) as typeof setTimeout
global.setInterval = ((fn: Parameters<typeof setInterval>[0], ms?: number, ...args: unknown[]) => {
  const id = _oi(fn as unknown as TimerHandler, ms as number, ...(args as unknown[])) as ReturnType<typeof global.setInterval>
  _intervals.add(id)
  return id as unknown as number
}) as typeof setInterval
global.clearTimeout = ((id: ReturnType<typeof global.setTimeout>) => {
  _timeouts.delete(id)
  return _ct(id as unknown as Parameters<typeof _ct>[0])
}) as typeof clearTimeout
global.clearInterval = ((id: ReturnType<typeof global.setInterval>) => {
  _intervals.delete(id)
  return _ci(id as unknown as Parameters<typeof _ci>[0])
}) as typeof clearInterval

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
    type Mockable = { getMockName?: () => string }
    const isMocked = (console.debug as unknown as Mockable)?.getMockName?.()
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
