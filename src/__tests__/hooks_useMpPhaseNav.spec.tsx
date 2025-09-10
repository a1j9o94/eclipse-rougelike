import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, act } from '@testing-library/react'
import { useMpPhaseNav } from '../hooks/useMpPhaseNav'

type HarnessProps = { multi: { [key: string]: unknown }; modeStart?: 'OUTPOST'|'COMBAT' }
function Harness({ multi, modeStart = 'OUTPOST' }: HarnessProps){
  const [mode, setMode] = React.useState<'OUTPOST'|'COMBAT'>(modeStart)
  const [fleet, setFleet] = React.useState<any[]>([])
  const [enemyFleet, setEnemyFleet] = React.useState<any[]>([])
  const [multiplayerPhase, setMultiplayerPhase] = React.useState<'menu'|'lobby'|'game'>('menu')
  const [log, setLog] = React.useState<string[]>([])
  useMpPhaseNav({
    gameMode: 'multiplayer',
    multi: multi as unknown as Parameters<typeof useMpPhaseNav>[0]['multi'],
    setters: { setMode, setFleet: (f)=>setFleet(f as any[]), setEnemyFleet: (f)=>setEnemyFleet(f as any[]), setMultiplayerPhase, setLog },
  })
  return <div data-mode={mode} data-phase={multiplayerPhase} data-pcnt={fleet.length} data-ecnt={enemyFleet.length} data-log={log.length} />
}

const snap = (id:string)=>({ frame: { id, name: id }, weapons: [], riftDice: 0, stats: { init:1, hullCap:1, valid:true, aim:0, shieldTier:0, regen:0 }, hull:1, alive:true, partIds: [] })

describe('useMpPhaseNav', () => {
  it('switches to COMBAT and adopts server snapshots on combat phase', async () => {
    const multi = {
      getPlayerId: ()=>'A',
      getOpponent: () => ({ playerId: 'B' }),
      gameState: { gamePhase: 'combat', playerStates: { A: { fleet: [snap('interceptor')] }, B: { fleet: [snap('cruiser')] } }, roundLog: ['Combat resolved.'] },
      roomDetails: { room: { status: 'playing' } },
      ackRoundPlayed: () => {},
    }
    const r = render(<Harness multi={multi} />)
    await act(async()=>{})
    const el = r.container.firstChild as HTMLElement
    expect(el.getAttribute('data-mode')).toBe('COMBAT')
    expect(Number(el.getAttribute('data-pcnt'))).toBe(1)
    expect(Number(el.getAttribute('data-ecnt'))).toBe(1)
    expect(Number(el.getAttribute('data-log'))).toBeGreaterThan(0)
  })

  it('ensures multiplayerPhase becomes game when phase is setup', async () => {
    const multi = { gameState: { gamePhase: 'setup', playerStates: {} }, roomDetails: { room: { status: 'playing' } } }
    const r = render(<Harness multi={multi} />)
    await act(async()=>{})
    const el = r.container.firstChild as HTMLElement
    expect(el.getAttribute('data-phase')).toBe('game')
  })

  it('does not enter game when setup but room is waiting', async () => {
    const multi = { gameState: { gamePhase: 'setup', playerStates: {} }, roomDetails: { room: { status: 'waiting' } } }
    const r = render(<Harness multi={multi} />)
    await act(async()=>{})
    const el = r.container.firstChild as HTMLElement
    expect(el.getAttribute('data-phase')).toBe('menu')
  })
})
