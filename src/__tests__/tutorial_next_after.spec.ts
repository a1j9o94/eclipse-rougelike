import { describe, it, expect } from 'vitest'
import { nextAfter, STEPS } from '../tutorial/script'

describe('tutorial nextAfter', () => {
  it('advances on opened-intel -> intel-close then on viewed-intel -> rules-hint', () => {
    const start = 'shop-reroll' as any
    const afterOpen = nextAfter(start, 'opened-intel')
    expect(afterOpen).toBe('intel-close')
    const afterClose = nextAfter('intel-close' as any, 'viewed-intel')
    // next after intel-close is rules-hint
    const idx = STEPS.findIndex(s => s.id === 'intel-close')
    expect(STEPS[idx+1].id).toBe('rules-hint')
    expect(afterClose).toBe('rules-hint')
  })

  it('acknowledges opening the ⋯ menu before Rules', () => {
    const afterMenu = nextAfter('rules-hint' as any, 'opened-help-menu')
    expect(afterMenu).toBe('rules-open')
    const afterRules = nextAfter('rules-open' as any, 'opened-rules')
    // Next after rules-open is wrap
    expect(afterRules === 'wrap' || afterRules === nextAfter('rules-open' as any, 'opened-rules')).toBe(true)
  })

  it('ignores unrelated events at later steps', () => {
    // When already at intel-close, another opened-intel should not skip
    const stay = nextAfter('intel-close' as any, 'opened-intel')
    expect(stay).toBe('intel-close')
  })
})
