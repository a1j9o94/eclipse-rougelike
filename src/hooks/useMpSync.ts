import { useEffect, useState } from 'react'

export type MpBasics = { isConvexAvailable?: boolean } | null

// Test-only ticking to pick up external mock mutations when Convex isn't reactive
export function useMpTestTick(multi: MpBasics, applied: boolean, intervalMs = 25) {
  const [testTick, setTestTick] = useState(0)
  useEffect(() => {
    if (!multi || multi.isConvexAvailable) return
    if (applied) return
    const id = setInterval(() => setTestTick((t) => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [multi?.isConvexAvailable, applied, intervalMs])
  return testTick
}
