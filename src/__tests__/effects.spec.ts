import { describe, it, expect } from 'vitest'
import { PARTS, RARE_PARTS, partEffects } from '../../shared/parts'

describe('partEffects display', () => {
  it('shows spike launcher max damage and hit chance', () => {
    const spike = RARE_PARTS.find(p=>p.id==='spike_launcher')!
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

  it('shows magnet icon for magnet hull', () => {
    const magnet = PARTS.hull.find(p=>p.id==='magnet_hull')!
    const eff = partEffects(magnet)
    expect(eff).toContain('🧲')
  })

  it('shows retaliation icon for spite plating', () => {
    const spite = PARTS.hull.find(p=>p.id==='spite_plating')!
    const eff = partEffects(spite)
    expect(eff).toContain('❤️1')
    expect(eff).toContain('💥')
  })

  it('shows beam and shield icon for entropy beam', () => {
    const beam = PARTS.weapons.find(p=>p.id==='entropy_beam')!
    const eff = partEffects(beam)
    expect(eff).toContain('🔆🛡️-1')
    expect(eff.some(e=>e.includes('🎲'))).toBe(false)
  })

  it('shows beam and init icon for disruptor beam', () => {
    const dis = RARE_PARTS.find(p=>p.id==='disruptor')!
    const eff = partEffects(dis)
    expect(eff).toContain('🔆🚀-1')
    expect(eff.some(e=>e.includes('🎲'))).toBe(false)
  })

  it('shows shield, hull, and retaliation for reflective armor', () => {
    const refl = RARE_PARTS.find(p=>p.id==='reflective_armor')!
    const eff = partEffects(refl)
    expect(eff).toContain('🛡️1')
    expect(eff).toContain('❤️1')
    expect(eff).toContain('💥')
  })

  it('shows hull and aim icons for sentient hull', () => {
    const sent = RARE_PARTS.find(p=>p.id==='sentient_hull')!
    const eff = partEffects(sent)
    expect(eff).toContain('❤️1')
    expect(eff).toContain('🎯1')
  })
})
