import { useCallback } from 'react'
import type { Research, Resources } from '../../shared/defaults'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { Ship, DifficultyId } from '../../shared/types'
import type { FactionId } from '../../shared/factions'
import { rollInventory } from '../game/shop'
import { calcRewards, ensureGraceResources, graceRecoverFleet } from '../game/rewards'

type MpLifecycle = { restartToSetup?: () => Promise<unknown> | void }

export function useRunLifecycle(params: {
  outcome: string
  combatOver: boolean
  livesRemaining: number
  gameMode: 'single'|'multiplayer'
  endless: boolean
  baseRerollCost: number
  fns: {
    resetRun: () => void
    recordWin: (faction: FactionId, difficulty: DifficultyId, research: Research, fleet: Ship[]) => void
    clearRunState: () => void
  }
  sfx: { playEffect: (k: string)=> Promise<void> | void }
  getters: {
    sector: () => number
    enemyFleet: () => Ship[]
    research: () => Research
    fleet: () => Ship[]
    blueprints: () => Record<FrameId, Part[]>
    capacity: () => { cap: number }
    faction?: () => FactionId
    difficulty?: () => DifficultyId
  }
  setters: {
    setMode: (m: 'OUTPOST'|'COMBAT') => void
    setResources: (updater: (r: Resources) => Resources) => void
    setShop: (s: { items: Part[] }) => void
    setShopVersion: (updater: (n: number) => number) => void
    setRerollCost: (n: number) => void
    setFleet: (f: Ship[]) => void
    setLog: (updater: (l: string[]) => string[]) => void
    setShowWin: (v: boolean) => void
    setEndless: (v: boolean) => void
    setBaseRerollCost: (n: number) => void
    setLivesRemaining?: (n: number) => void
  }
  multi?: MpLifecycle
}){
  const { outcome, combatOver, livesRemaining, gameMode, endless, baseRerollCost, fns, sfx, getters, setters, multi } = params
  return useCallback(async () => {
    if(!combatOver) return
    if(outcome==='Victory'){
      const sector = getters.sector()
      const research = getters.research()
      const fleet = getters.fleet()
      // Cull and restore fleet
      const culled = fleet.filter(s => s.alive).map(s => ({ ...s, hull: s.stats.hullCap }))
      setters.setFleet(culled)
      if (sector > 10) {
        // Final victory
        const faction = getters.faction?.()
        const difficulty = getters.difficulty?.()
        if (faction && difficulty) {
          try { fns.recordWin(faction, difficulty, research, culled) } catch { /* ignore */ }
        }
        try { fns.clearRunState() } catch { /* ignore */ }
        await sfx.playEffect('page')
        setters.setMode('OUTPOST')
        if (!endless) {
          setters.setShowWin(true)
        } else {
          setters.setShop({ items: rollInventory(research) })
          setters.setShopVersion(v => v + 1)
        }
      } else {
        await sfx.playEffect('page')
        setters.setMode('OUTPOST')
        setters.setShop({ items: rollInventory(research) })
        setters.setShopVersion(v => v + 1)
      }
      setters.setRerollCost(baseRerollCost)
      return
    }
    // defeat path
    // Multiplayer: inform server and let phase return to outpost
    if (gameMode==='multiplayer' && multi) {
      try { await multi.restartToSetup?.() } catch {/* ignore */}
    }
    // If caller marked the run over, honor it directly
    if(outcome==='Defeat — Run Over' || (gameMode==='single' && (livesRemaining<=0))){
      await sfx.playEffect('page')
      fns.resetRun()
    } else {
      // Life lost (single-player): decrement lives, grace recover and grant rewards
      if (gameMode==='single' && typeof setters.setLivesRemaining === 'function') {
        try { setters.setLivesRemaining(Math.max(0, (livesRemaining||0) - 1)) } catch { /* ignore */ }
      }
      const fleet = getters.fleet()
      const bp = getters.blueprints()
      const sector = getters.sector()
      const enemyFleet = getters.enemyFleet()
      const recovered = graceRecoverFleet(fleet, bp)
      setters.setFleet(recovered)
      const rw = calcRewards(enemyFleet, sector)
      setters.setResources(r => ensureGraceResources({
        credits: r.credits + rw.c,
        materials: r.materials + rw.m,
        science: r.science + rw.s,
      }))
      await sfx.playEffect('page')
      setters.setMode('OUTPOST')
      const research = getters.research()
      setters.setShop({ items: rollInventory(research) })
      setters.setShopVersion(v => v + 1)
    }
    setters.setRerollCost(baseRerollCost)
  }, [combatOver, outcome, gameMode, multi, sfx, getters, setters, endless, baseRerollCost, fns])
}

export default useRunLifecycle
