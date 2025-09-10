import { describe, it, expect, vi } from 'vitest'
import { createFakeTransport } from '../mp/fakeTransport'

describe('MultiTransport (fake)', () => {
  it('host and guest can ready up and advance to combat', async () => {
    const A = createFakeTransport('room-1', 'A')
    const B = createFakeTransport('room-1', 'B')

    const aSubs = vi.fn()
    const bSubs = vi.fn()
    A.subscribe(aSubs)
    B.subscribe(bSubs)

    await A.submitFleetSnapshot({ fleet: ['A1'] })
    await B.submitFleetSnapshot({ fleet: ['B1'] })
    await A.updateFleetValidity(true)
    await B.updateFleetValidity(true)

    await A.setReady(true)
    await B.setReady(true)

    const aGame = A.getGameState()!
    const bGame = B.getGameState()!
    expect(aGame.phase).toBe('combat')
    expect(bGame.phase).toBe('combat')
    expect(aSubs).toHaveBeenCalled()
    expect(bSubs).toHaveBeenCalled()
  })

  it('server can mark finished and move to next setup', async () => {
    const A = createFakeTransport('room-2', 'A')
    const B = createFakeTransport('room-2', 'B')
    await A.updateGameState({ phase: 'finished' })
    expect(A.getGameState()!.phase).toBe('finished')
    await A.updateGameState({ phase: 'setup', round: 2 })
    expect(A.getGameState()!.phase).toBe('setup')
    expect(A.getGameState()!.round).toBe(2)
    expect(B.getGameState()!.phase).toBe('setup')
    expect(B.getGameState()!.round).toBe(2)
  })
})

