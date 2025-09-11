import { describe, it, expect } from 'vitest'
import { targetIndex } from '../game/combat'
import type { Ship } from '../../shared/types'

function ship({ alive=true, valid=true, guns=1, hull=2 }={}){
  return {
    alive,
    hull,
    frame: { id: 'interceptor' },
    weapons: Array.from({ length: guns }),
    stats: { valid } as any,
  } as Ship
}

describe('targetIndex allows targeting alive-but-invalid ships', () => {
  it('returns defender index even if defender is invalid', () => {
    const def = [ship({ valid: false, guns: 0, hull: 2 })]
    const idxKill = targetIndex(def, 'kill')
    const idxGuns = targetIndex(def, 'guns')
    expect(idxKill).toBe(0)
    expect(idxGuns).toBe(0)
  })
})

