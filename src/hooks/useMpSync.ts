import { useEffect, useState } from 'react'
import type { PlayerState, GameState, Research, ShipSnapshot } from '../../shared/mpTypes'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { Ship } from '../../shared/types'
import { ECONOMY } from '../../shared/economy'
import { setEconomyModifiers } from '../game/economy'
import { setRareTechChance } from '../game/shop'
import { mapBlueprintIdsToParts, applyBlueprintHints } from '../multiplayer/blueprintHints'
import { fromSnapshotToShip } from '../multiplayer/snapshot'
import { INITIAL_CAPACITY } from '../../shared/defaults'

export type MpBasics = { isConvexAvailable?: boolean } | null

// Test-only ticking to pick up external mock mutations when Convex isn't reactive
export function useMpTestTick(multi: MpBasics, applied: boolean, intervalMs = 25) {
  const [testTick, setTestTick] = useState(0)
  useEffect(() => {
    if (!multi || multi.isConvexAvailable) return
    if (applied) return
    const id = setInterval(() => setTestTick((t) => t + 1), intervalMs)
    // In Node test env, do not keep the event loop alive
    ;(id as unknown as { unref?: () => void })?.unref?.()
    return () => clearInterval(id)
  }, [multi, applied, intervalMs])
  return testTick
}

export type MpClient = {
  isConvexAvailable?: boolean
  roomDetails?: { room?: { status?: string; gameConfig?: { startingShips?: number } }, players?: Array<{ playerId:string; playerName?:string; lives?:number; faction?:string }> } | null
  gameState?: GameState | null
  getPlayerId?: () => string | null
  getMyGameState?: () => PlayerState | null
}

export function useMpSetupSync(params: {
  gameMode: 'single' | 'multiplayer'
  multi: MpClient
  deps: { testTick: number }
  vars: {
    baseRerollCost: number
    rerollCost: number
    mpRerollInitRound: number
    mpLastServerApplyRound: number
    mode: 'OUTPOST'|'COMBAT'
    blueprints: Record<FrameId, Part[]>
    fleet: Ship[]
  }
  setters: {
    setMode: (m: 'OUTPOST'|'COMBAT') => void
    setBlueprints: (bp: Record<FrameId, Part[]>) => void
    setResearch: (r: Research) => void
    setBaseRerollCost: (n: number) => void
    setRerollCost: (n: number) => void
    setCapacity: (c: { cap: number } | ((c: { cap:number }) => { cap:number })) => void
    setFleet: (s: Ship[]) => void
    setFocused: (n: number) => void
    setMpLastServerApplyRound: (n:number) => void
    setMpServerSnapshotApplied: (b:boolean) => void
    setMpRerollInitRound: (n:number) => void
  }
}) {
  const { gameMode, multi, deps, vars, setters } = params
  const { testTick } = deps
  const { baseRerollCost, rerollCost, mpRerollInitRound, mpLastServerApplyRound, mode, blueprints, fleet } = vars
  const { setMode, setBlueprints, setResearch, setBaseRerollCost, setRerollCost, setCapacity, setFleet, setFocused, setMpLastServerApplyRound, setMpServerSnapshotApplied, setMpRerollInitRound } = setters

  useEffect(() => {
    if (gameMode !== 'multiplayer') return
    if (multi.gameState?.gamePhase !== 'setup') return
    // Avoid applying server snapshots/economy until the host has actually started the match
    const isPlaying = multi.roomDetails?.room?.status === 'playing'
    if (!isPlaying) return
    try {
      const st0 = multi.getMyGameState?.() ?? (() => {
        const myId = multi.getPlayerId?.() as string | null
        return myId ? (multi.gameState?.playerStates as Record<string, PlayerState> | undefined)?.[myId] || null : null
      })()
      const srv0 = Array.isArray(st0?.fleet) ? (st0!.fleet as ShipSnapshot[]) : []
      if (srv0.length) {
        console.debug('[Sync] server snapshot frames', srv0.map(s => s?.frame?.id))
      }
      const st = multi.getMyGameState?.() ?? (() => {
        const myId = multi.getPlayerId?.() as string | null
        return myId ? (multi.gameState?.playerStates as Record<string, PlayerState> | undefined)?.[myId] || null : null
      })()
      const serverFleet = Array.isArray(st?.fleet) ? (st.fleet as ShipSnapshot[]) : []
      const roundNum = (multi.gameState?.roundNum || 1) as number
      const srvResearch = st?.research as Research | undefined
      const econ = st?.economy
      let handledRerollBase = false
      // If server persisted current rerollCost, prefer it over any base correction
      if (typeof (st as { rerollCost?: number } | null | undefined)?.rerollCost === 'number') {
        const srvCost = Number((st as { rerollCost: number }).rerollCost)
        if (srvCost !== rerollCost) {
          setRerollCost(srvCost)
          try { console.debug('[MP] applied server rerollCost', { srvCost, round: roundNum }) } catch { /* noop */ }
        }
        // Consider base handled for this round
        handledRerollBase = true
      }
      const mods = (st?.modifiers as { startingFrame?: FrameId; rareChance?: number; capacityCap?: number; blueprintHints?: Record<string,string[]> } | undefined)
      const bpIds = (st?.blueprintIds as Record<FrameId, string[]> | undefined)

      const bpEquals = (a: Record<FrameId, Part[]>, b: Record<FrameId, Part[]>) => {
        const frames: FrameId[] = ['interceptor','cruiser','dread']
        for (const f of frames) {
          const aa = a[f] || []
          const bb = b[f] || []
          if (aa.length !== bb.length) return false
          for (let i=0; i<aa.length; i++) { if (aa[i]?.id !== bb[i]?.id) return false }
        }
        return true
      }

      let blueprintsApplied = false
      if (bpIds && (bpIds.interceptor.length || bpIds.cruiser.length || bpIds.dread.length)) {
        const mapped = mapBlueprintIdsToParts(bpIds)
        try { console.debug('[MP] apply class blueprints from ids', { interceptor: mapped.interceptor.length, cruiser: mapped.cruiser.length, dread: mapped.dread.length }) } catch { /* noop */ }
        setBlueprints(bpEquals(blueprints as Record<FrameId, Part[]>, mapped) ? (blueprints as Record<FrameId, Part[]>) : (mapped as Record<FrameId, Part[]>))
        blueprintsApplied = true
      } else if (mods && mods.blueprintHints) {
        const next = applyBlueprintHints(blueprints as Record<string, Part[]>, mods.blueprintHints as Record<string, string[]>) as Record<FrameId, Part[]>
        setBlueprints(bpEquals(blueprints as Record<FrameId, Part[]>, next) ? (blueprints as Record<FrameId, Part[]>) : next)
        blueprintsApplied = true
      } else {
        blueprintsApplied = true
      }

      let factionsApplied = false
      if (srvResearch && typeof srvResearch.Military === 'number') {
        setResearch({ ...srvResearch })
        factionsApplied = true
      }

      // Reroll base immediate correction
      if (multi.gameState?.gamePhase === 'setup' && typeof econ?.rerollBase === 'number') {
        const econBase = Number(econ.rerollBase)
        // Always align baseRerollCost; only snap rerollCost if it hasn't diverged this round
        if (baseRerollCost !== econBase) {
          setBaseRerollCost(econBase)
        }
        if (rerollCost === baseRerollCost) {
          setRerollCost(econBase)
          try { console.debug('[MP] reroll base corrected from econ (direct)', { base: econBase, round: roundNum }) } catch { /* noop */ }
        }
        handledRerollBase = true
        setMpRerollInitRound(roundNum)
      }
      if (multi.gameState?.gamePhase === 'setup' && roundNum !== mpRerollInitRound && !handledRerollBase) {
        const fromEcon = (econ && typeof econ.rerollBase === 'number') ? econ.rerollBase : undefined
        if (fromEcon != null) {
          setBaseRerollCost(fromEcon)
          setRerollCost(fromEcon)
        } else {
          // Authoritative fallback for MP when server provides no per-player base
          setBaseRerollCost(ECONOMY.reroll.base)
          setRerollCost(ECONOMY.reroll.base)
        }
        try { console.debug('[MP] reroll base applied (my state)', { base: (fromEcon != null ? fromEcon : (baseRerollCost === ECONOMY.reroll.base && rerollCost === ECONOMY.reroll.base ? ECONOMY.reroll.base : baseRerollCost)), round: roundNum }) } catch { /* noop */ }
        factionsApplied = true
        setMpRerollInitRound(roundNum)
      }
      if (econ && (typeof econ.creditMultiplier === 'number' || typeof econ.materialMultiplier === 'number')) {
        if (gameMode !== 'multiplayer') {
          setEconomyModifiers({ credits: econ.creditMultiplier ?? 1, materials: econ.materialMultiplier ?? 1 })
        } else {
          try { console.debug('[MP] using my economy multipliers (UI only)', { credits: econ.creditMultiplier ?? 1, materials: econ.materialMultiplier ?? 1 }) } catch { /* noop */ }
        }
        factionsApplied = true
      }
      if (multi.gameState?.gamePhase === 'setup' && typeof econ?.rerollBase === 'number' && baseRerollCost !== econ.rerollBase) {
        if (rerollCost === baseRerollCost) {
          setBaseRerollCost(econ.rerollBase)
          setRerollCost(econ.rerollBase)
          try { console.debug('[MP] reroll base corrected from econ (my state)', { base: econ.rerollBase, round: roundNum }) } catch { /* noop */ }
        }
        setMpRerollInitRound(roundNum)
      }

      if (mods && typeof mods.rareChance === 'number') {
        setRareTechChance(mods.rareChance as number)
        factionsApplied = true
      }
      if (mods && typeof mods.capacityCap === 'number') {
        setCapacity(c => {
          const nextCap = Math.max((c as { cap:number }).cap, mods.capacityCap as number)
          if ((c as { cap:number }).cap === nextCap) return (c as { cap:number })
          try { console.debug('[MP] capacity cap applied (my state)', { prev: (c as { cap:number }).cap, next: nextCap }) } catch { /* noop */ }
          return ({ cap: nextCap })
        })
        factionsApplied = true
      }

      const allFactionsApplied = blueprintsApplied || factionsApplied || (!bpIds && !mods?.blueprintHints && !srvResearch)
      if (multi.gameState?.gamePhase === 'setup' && mode !== 'OUTPOST' && allFactionsApplied) {
        setMode('OUTPOST')
      }
      if (serverFleet.length > 0) {
        const mapped = serverFleet.map(fromSnapshotToShip) as unknown as Ship[]
        const framesOf = (arr: Ship[]) => arr.map(s => s.frame.id).sort().join(',')
        const differentFrames = framesOf(mapped) !== framesOf(fleet)
        if (roundNum !== mpLastServerApplyRound || mapped.length > fleet.length || differentFrames) {
          console.debug('[Sync] Applying server fleet snapshot in setup', { roundNum, serverCount: mapped.length, localCount: fleet.length })
          setFleet(mapped)
          if (roundNum === 1) {
            const baseline = Math.max(INITIAL_CAPACITY.cap, mapped.length)
            const capFromMods = (mods && typeof mods.capacityCap === 'number') ? (mods.capacityCap as number) : undefined
            const nextCap = capFromMods != null ? Math.max(baseline, capFromMods) : baseline
            setCapacity({ cap: nextCap })
          } else {
            setCapacity(c => ({ cap: Math.max((c as { cap:number }).cap, mapped.length) }))
          }
          setFocused(0)
          setMpLastServerApplyRound(roundNum)
          setMpServerSnapshotApplied(true)
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, multi?.gameState?.playerStates, multi?.gameState?.roundNum, testTick])
}
