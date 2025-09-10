import { useEffect, useRef } from 'react'
import { dlog } from '../utils/debug'
import type { OutpostEffects } from '../engine/commands'
import type { Part } from '../../shared/parts'

export type EffectSink = {
  warn: (code: string) => void
  startCombat: () => void
  shopItems?: (items: Part[]) => void
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
    dlog('effects', effects)
    if (effects.warning) sink.warn(effects.warning)
    if (effects.startCombat) sink.startCombat()
    if (effects.shopItems && sink.shopItems) sink.shopItems(effects.shopItems)
    // Future: route sound/timer/dialog effects here
    // Dedupe only within the same microtask: allow identical effects later.
    Promise.resolve().then(() => { lastRef.current = '' })
  }, [effects, sink])
}
