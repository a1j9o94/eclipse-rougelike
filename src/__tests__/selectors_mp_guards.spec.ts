import { describe, it, expect } from 'vitest'
import { buildMpGuards } from '../selectors/mpGuards'

describe('selectors/mpGuards', () => {
  it('combines local and server flags safely', () => {
    const guards = buildMpGuards(undefined, true)
    expect(guards).toEqual({ myReady:false, oppReady:false, localValid:true, serverValid:undefined, haveSnapshot:false })
  })

  it('derives readiness and snapshot from multi', () => {
    const multi = {
      getPlayerId: ()=>'A',
      getCurrentPlayer: ()=>({ isReady: true }),
      getOpponent: ()=>({ isReady: false, playerId: 'B' }),
      gameState: { playerStates: { A: { fleetValid: true, fleet: [1,2,3] } as any } }
    }
    const guards = buildMpGuards(multi as any, true)
    expect(guards.myReady).toBe(true)
    expect(guards.oppReady).toBe(false)
    expect(guards.localValid).toBe(true)
    expect(guards.serverValid).toBe(true)
    expect(guards.haveSnapshot).toBe(true)
  })
})

