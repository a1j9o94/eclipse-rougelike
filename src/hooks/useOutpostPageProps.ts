import { useMemo } from 'react'
import type { Part } from '../../shared/parts'
import type { Resources, Research } from '../../shared/defaults'
import type { Ship, CapacityState } from '../../shared/types'
import type { FrameId } from '../game'
import useOutpostVm from './useOutpostVm'
import type { MpBasics } from '../adapters/mpSelectors'
type UseOutpostVmArgs = Parameters<typeof useOutpostVm>[0]

export type OutpostPageProps = {
  gameMode: 'single'|'multiplayer'
  multi?: MpBasics
  resources: Resources
  rerollCost: number
  doReroll: () => void
  research: Research
  researchLabel: (t: 'Military'|'Grid'|'Nano') => string
  canResearch: (t: 'Military'|'Grid'|'Nano') => boolean
  researchTrack: (t: 'Military'|'Grid'|'Nano') => void
  fleet: Ship[]
  focused: number
  setFocused: (n: number) => void
  buildShip: () => void
  upgradeShip: (idx: number) => void
  upgradeDock: () => void
  upgradeLockInfo: (s: Ship | null | undefined) => { need:number; next:string } | null
  blueprints: Record<FrameId, Part[]>
  sellPart: (frameId: FrameId, idx: number) => void
  shop: { items: Part[] }
  ghost: (ship: Ship, part: Part) => { use:number; prod:number; valid:boolean; slotsUsed:number; slotCap:number; slotOk:boolean; targetName:string; initBefore:number; initAfter:number; initDelta:number; hullBefore:number; hullAfter:number; hullDelta:number }
  buyAndInstall: (part: Part) => void
  capacity: CapacityState
  tonnage: { used: number; cap: number }
  sector: number
  endless: boolean
  myReady?: boolean
  oppReady?: boolean
  mpGuards?: { myReady:boolean; oppReady?:boolean; localValid:boolean; serverValid?:boolean; haveSnapshot:boolean }
  economyMods?: { credits:number; materials:number }
  startCombat: () => void
  onRestart: () => void
  fleetValid: boolean
}

export function useOutpostPageProps(params: {
  // mode
  gameMode: 'single'|'multiplayer'
  // primitives
  resources: Resources
  research: Research
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  capacity: CapacityState
  tonnage: { used: number; cap: number }
  shop: { items: Part[] }
  focused: number
  setFocused: (n: number) => void
  rerollCost: number
  researchLabel: (t: 'Military'|'Grid'|'Nano') => string
  canResearch: (t: 'Military'|'Grid'|'Nano') => boolean
  researchTrack: (t: 'Military'|'Grid'|'Nano') => void
  buildShip: () => void
  upgradeShip: (idx: number) => void
  upgradeDock: () => void
  ghost: (ship: Ship, part: Part) => { use:number; prod:number; valid:boolean; slotsUsed:number; slotCap:number; slotOk:boolean; targetName:string; initBefore:number; initAfter:number; initDelta:number; hullBefore:number; hullAfter:number; hullDelta:number }
  sellPart: (frameId: FrameId, idx: number) => void
  buyAndInstall: (part: Part) => void
  sector: number
  endless: boolean
  // vm extras
  multi?: MpBasics
  spStartCombat: () => void
  resetRun: () => void
  setBlueprints: (bp: Record<FrameId, Part[]>) => void
  setResources: (r: Resources) => void
  setResearch: (r: Research) => void
  setCapacity: (c: CapacityState) => void
  setRerollCost: (n: number) => void
  setBaseRerollCost: (n: number) => void
  setMpSeeded: (v: boolean) => void
  setMpSeedSubmitted: (v: boolean) => void
  setMpServerSnapshotApplied: (v: boolean) => void
  setMpLastServerApplyRound: (n: number) => void
  setMpRerollInitRound: (n: number) => void
  doReroll: () => void
  upgradeLockInfo: (s: Ship | null | undefined) => { need:number; next:string } | null
}): OutpostPageProps {
  const vm = useOutpostVm(params as UseOutpostVmArgs)
  return useMemo(() => ({
    gameMode: params.gameMode,
    multi: params.multi,
    resources: params.resources,
    rerollCost: params.rerollCost,
    doReroll: params.doReroll,
    research: params.research,
    researchLabel: params.researchLabel,
    canResearch: params.canResearch,
    researchTrack: params.researchTrack,
    fleet: params.fleet,
    focused: params.focused,
    setFocused: params.setFocused,
    buildShip: params.buildShip,
    upgradeShip: params.upgradeShip,
    upgradeDock: params.upgradeDock,
    upgradeLockInfo: params.upgradeLockInfo,
    blueprints: params.blueprints,
    sellPart: params.sellPart,
    shop: params.shop,
    ghost: params.ghost,
    buyAndInstall: params.buyAndInstall,
    capacity: params.capacity,
    tonnage: params.tonnage,
    sector: params.sector,
    endless: params.endless,
    myReady: vm.myReady,
    oppReady: vm.oppReady,
    mpGuards: vm.mpGuards,
    economyMods: vm.economyMods,
    startCombat: vm.startCombat,
    onRestart: vm.onRestart,
    fleetValid: vm.fleetValid,
  }), [params, vm])
}

export default useOutpostPageProps
