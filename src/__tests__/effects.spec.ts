import { describe, it, expect } from 'vitest'
import { PARTS, partEffects } from '../config/parts'

describe('partEffects display', () => {
  it('shows spike launcher max damage and hit chance', () => {
    const spike = PARTS.weapons.find(p=>p.id==='spike_launcher')!
    const eff = partEffects(spike)
    expect(eff).toContain('💥3')
    expect(eff).toContain('🎯17%')
  })

  it('shows standard cannon damage and hit chance', () => {
    const plasma = PARTS.weapons.find(p=>p.id==='plasma')!
    const eff = partEffects(plasma)
    expect(eff).toContain('💥1')
    expect(eff).toContain('🎯17%')
  })
})
