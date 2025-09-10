import { describe, it, expect } from 'vitest'
import { makeResearchLabel, makeCanResearch } from '../selectors/researchUi'

describe('selectors/researchUi', () => {
  it('SP label and canResearch reflect base economy', () => {
    const research = { Military: 1, Grid: 1, Nano: 1 }
    const resources = { credits: 20, materials: 0, science: 1 }
    const label = makeResearchLabel('single', research as any, resources as any)
    const can = makeCanResearch('single', research as any, resources as any)
    expect(label('Military')).toMatch(/Military 1→2 \(20¢ \+ 1🔬\)/)
    expect(can('Military')).toBe(true)
  })
})

