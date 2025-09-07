import { useEffect, useRef } from 'react'
import type { OutpostEffects } from '../engine/commands'

export type EffectSink = {
  warn: (code: string) => void
  startCombat: () => void
  sound?: (key: string) => void
}

// Runs one-shot effects emitted by the engine/adapters.
// Idempotence: collapses identical effect objects seen in the same microtask.
export function useEffectsRunner(effects: OutpostEffects | undefined, sink: EffectSink) {
  const lastRef = useRef<string>('')

  useEffect(() => {
    if (!effects) return
    const key = JSON.stringify(effects)
    if (key === lastRef.current) return
    lastRef.current = key
    if (effects.warning) sink.warn(effects.warning)
    if (effects.startCombat) sink.startCombat()
    // Future: route sound/timer/dialog effects here
  }, [effects, sink])
}
