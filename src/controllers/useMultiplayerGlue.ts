import { useMpPhaseNav } from '../hooks/useMpPhaseNav'
import { useMpSetupSync } from '../hooks/useMpSync'
import type { Dispatch, SetStateAction } from 'react'
import { useMpSeedSubmit } from '../hooks/useMpSeedSubmit'
import type { MpClient as MultiLike } from '../hooks/useMpSync'
import type { Research } from '../../shared/defaults'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { Ship } from '../../shared/types'

export function useMultiplayerGlue(params: {
  gameMode: 'single'|'multiplayer'
  multi: MultiLike
  testTick: number
  // vars
  baseRerollCost: number
  rerollCost: number
  mpRerollInitRound: number
  mpLastServerApplyRound: number
  mode: 'OUTPOST'|'COMBAT'
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  mpServerSnapshotApplied: boolean
  mpSeedSubmitted: boolean
  mpSeeded: boolean
  // setters
  setMode: (m: 'OUTPOST'|'COMBAT') => void
  setFleet: (s: Ship[]) => void
  setEnemyFleet: (s: Ship[]) => void
  setMultiplayerPhase: (p: 'menu'|'lobby'|'game') => void
  setLog: Dispatch<SetStateAction<string[]>>
  setBlueprints: (bp: Record<FrameId, Part[]>) => void
  setResearch: (r: Research) => void
  setBaseRerollCost: (n: number) => void
  setRerollCost: (n: number) => void
  setCapacity: Dispatch<SetStateAction<{ cap: number }>>
  setFocused: (n: number) => void
  setMpLastServerApplyRound: (n: number) => void
  setMpServerSnapshotApplied: (v: boolean) => void
  setMpSeedSubmitted: (v: boolean) => void
  setMpSeeded: (v: boolean) => void
  // flags
  fleetValid: boolean
}){
  useMpPhaseNav({
    gameMode: params.gameMode,
    multi: params.multi,
    setters: {
      setMode: params.setMode,
      setFleet: (f)=> params.setFleet(f as unknown as Ship[]),
      setEnemyFleet: (f)=> params.setEnemyFleet(f as unknown as Ship[]),
      setMultiplayerPhase: params.setMultiplayerPhase,
      setLog: params.setLog,
    },
  })

  useMpSetupSync({
    gameMode: params.gameMode,
    multi: params.multi,
    deps: { testTick: params.testTick },
    vars: {
      baseRerollCost: params.baseRerollCost,
      rerollCost: params.rerollCost,
      mpRerollInitRound: params.mpRerollInitRound,
      mpLastServerApplyRound: params.mpLastServerApplyRound,
      mode: params.mode,
      blueprints: params.blueprints,
      fleet: params.fleet,
    },
    setters: {
      setMode: params.setMode,
      setBlueprints: (bp)=> params.setBlueprints(bp as Record<FrameId, Part[]>),
      setResearch: (r)=> params.setResearch(r as Research),
      setBaseRerollCost: params.setBaseRerollCost,
      setRerollCost: params.setRerollCost,
      setCapacity: params.setCapacity,
      setFleet: (s)=> params.setFleet(s as unknown as Ship[]),
      setFocused: params.setFocused,
      setMpLastServerApplyRound: params.setMpLastServerApplyRound,
      setMpServerSnapshotApplied: params.setMpServerSnapshotApplied,
    },
  })

  useMpSeedSubmit({
    gameMode: params.gameMode,
    multi: params.multi,
    mpServerSnapshotApplied: params.mpServerSnapshotApplied,
    mpSeedSubmitted: params.mpSeedSubmitted,
    mpSeeded: params.mpSeeded,
    setMpSeedSubmitted: params.setMpSeedSubmitted,
    setMpSeeded: params.setMpSeeded,
    setFleet: (s)=> params.setFleet(s as unknown as Ship[]),
    setCapacity: params.setCapacity,
    setFocused: params.setFocused,
    blueprints: params.blueprints as Record<FrameId, Part[]>,
    fleetValid: params.fleetValid,
  })
}

export default useMultiplayerGlue
