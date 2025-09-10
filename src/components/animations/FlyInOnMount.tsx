import { useEffect, useState, type PropsWithChildren } from 'react'

type Dir = 'top' | 'bottom'

export type FlyInOnMountProps = PropsWithChildren<{
  direction: Dir
  play?: boolean
  delayMs?: number
  durationMs?: number
  testId?: string
  onDone?: () => void
  className?: string
}>

/**
 * Simple entrance animation: children slide in from top or bottom on mount.
 * Uses CSS transforms with Tailwind utility classes, no external deps.
 */
export default function FlyInOnMount({
  direction,
  play = true,
  delayMs = 0,
  durationMs = 700,
  testId,
  onDone,
  className,
  children,
}: FlyInOnMountProps){
  const [offset, setOffset] = useState<boolean>(play)

  useEffect(() => {
    if (!play) return
    const start = setTimeout(() => setOffset(false), Math.max(0, delayMs))
    const done = setTimeout(() => { onDone?.() }, Math.max(0, delayMs + durationMs))
    return () => { clearTimeout(start); clearTimeout(done) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const base = `transition-transform transition-opacity ease-out duration-[${durationMs}ms] will-change-transform`
  const hidden = direction === 'top'
    ? 'translate-y-[-48vh] opacity-0'
    : 'translate-y-[48vh] opacity-0'
  const shown = 'translate-y-0 opacity-100'

  return (
    <div data-testid={testId} className={`${base} ${offset ? hidden : shown} ${className ?? ''}`}>
      {children}
    </div>
  )
}
