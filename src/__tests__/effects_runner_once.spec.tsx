import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useEffectsRunner, type EffectSink } from '../hooks/useEffectsRunner'
import type { OutpostEffects } from '../engine/commands'

function Harness({ effects, sink }: { effects: OutpostEffects | undefined; sink: EffectSink }){
  useEffectsRunner(effects, sink)
  return <div />
}

describe('useEffectsRunner — once-only semantics', () => {
  it('runs each effect exactly once per distinct payload', () => {
    const start = vi.fn()
    const warn = vi.fn()
    const shop = vi.fn()
    const sink: EffectSink = { startCombat: start, warn, shopItems: shop }

    const fx1: OutpostEffects = { startCombat: true }
    const fx2: OutpostEffects = { warning: 'test', shopItems: [] }

    const { rerender } = render(<Harness effects={fx1} sink={sink} />)
    expect(start).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(0)

    // Re-render with the same object (stringified equal) — should not fire again
    rerender(<Harness effects={fx1} sink={sink} />)
    expect(start).toHaveBeenCalledTimes(1)

    // Change to a different payload — new effects fire
    rerender(<Harness effects={fx2} sink={sink} />)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(shop).toHaveBeenCalledTimes(1)

    // Null -> no-op
    rerender(<Harness effects={undefined} sink={sink} />)
    expect(start).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
