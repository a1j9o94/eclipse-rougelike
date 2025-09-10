import { applyEconomyModifiers, getDefaultEconomyModifiers, type EconMods } from '../game/economy'
import { makeShip, getFrame } from '../game'
import { applyBlueprintToFleet as applyBpToFleet, canInstallOnClass as canInstallClass, updateBlueprint as updateBp } from '../game/blueprints'
import { buildInterceptor as buildI, upgradeShipAt as upgradeAt, expandDock as expandD, buildInterceptorWithMods as buildIWM, upgradeShipAtWithMods as upgradeAtWM, expandDockWithMods as expandDWM } from '../game/hangar'
import type { Part } from '../../shared/parts'
import type { Ship } from '../../shared/types'
import type { Resources, Research } from '../../shared/defaults'
import type { CapacityState } from '../../shared/types'
import type { FrameId } from '../game'

export type BuyContext = {
  gameMode: 'single' | 'multiplayer'
  resources: Resources
  fleet: Ship[]
  focusedIndex: number
  blueprints: Record<FrameId, Part[]>
  economyMods?: EconMods
}

export function getEconomyForMode(ctx: { gameMode: 'single' | 'multiplayer'; economyMods?: EconMods }): EconMods {
  // Always prefer provided modifiers (set by faction or MP state). Fallback to defaults.
  return ctx.economyMods || getDefaultEconomyModifiers()
}

export function canInstallOnClass(blueprints: Record<FrameId, Part[]>, frameId: FrameId, part: Part) {
  return canInstallClass(blueprints, frameId, part)
}

export function applyBlueprintToFleet(frameId: FrameId, parts: Part[], fleet: Ship[]): Ship[] {
  return applyBpToFleet(frameId, parts, fleet)
}

export function updateBlueprint(
  blueprints: Record<FrameId, Part[]>,
  fleet: Ship[],
  frameId: FrameId,
  mutate: (arr: Part[]) => Part[],
  allowInvalid = false,
): { blueprints: Record<FrameId, Part[]>; fleet: Ship[]; updated: boolean } {
  const res = updateBp(blueprints, frameId, mutate, allowInvalid)
  if (!res.updated) return { blueprints, fleet, updated: false }
  const nextFleet = applyBlueprintToFleet(frameId, res.blueprints[frameId], fleet)
  return { blueprints: res.blueprints as Record<FrameId, Part[]>, fleet: nextFleet, updated: true }
}

export function buyAndInstall(part: Part, ctx: BuyContext): null | {
  resources: Resources
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  warning?: string
} {
  const ship = ctx.fleet[ctx.focusedIndex]
  if (!ship) return null
  const frameId = ship.frame.id as FrameId
  const econ = getEconomyForMode(ctx)
  const price = Math.max(0, applyEconomyModifiers(part.cost || 0, econ, 'credits'))
  if (ctx.resources.credits < price) return null
  const chk = canInstallOnClass(ctx.blueprints, frameId, part)
  if (!chk.ok) return null
  const nextResources: Resources = { ...ctx.resources, credits: ctx.resources.credits - price }
  const res = updateBlueprint(ctx.blueprints, ctx.fleet, frameId, arr => [...arr, part], true)
  const warning = chk.tmp.stats.valid ? undefined : 'invalid-power-or-drive'
  return { resources: nextResources, blueprints: res.blueprints, fleet: res.fleet, warning }
}

export function sellPart(frameId: FrameId, idx: number, blueprints: Record<FrameId, Part[]>, resources: Resources, fleet: Ship[]): null | {
  resources: Resources
  blueprints: Record<FrameId, Part[]>
  fleet: Ship[]
  sold: Part
} {
  const arr = blueprints[frameId]
  if (!arr) return null
  const part = arr[idx]
  if (!part) return null
  const next = arr.filter((_, i) => i !== idx)
  const tmp = makeShip(getFrame(frameId), next)
  const refund = Math.floor((part.cost || 0) * 0.25)
  const nextRes: Resources = { ...resources, credits: resources.credits + refund }
  const res = updateBlueprint(blueprints, fleet, frameId, () => next, true)
  const _unused = tmp // keeps parity with existing validity check, handled by consumers
  void _unused
  return { resources: nextRes, blueprints: res.blueprints, fleet: res.fleet, sold: part }
}

export function buildShip(
  blueprints: Record<FrameId, Part[]>,
  resources: Resources,
  tonnageUsed: number,
  capacity: CapacityState,
  gameMode: 'single' | 'multiplayer',
  economyMods?: EconMods,
): null | { ship: Ship; resources: Resources } {
  const res = gameMode === 'multiplayer'
    ? buildIWM(blueprints, resources, tonnageUsed, capacity, economyMods || getDefaultEconomyModifiers())
    : buildI(blueprints, resources, tonnageUsed, capacity)
  if (!res) return null
  const nextRes: Resources = { ...resources, credits: resources.credits + res.delta.credits, materials: resources.materials + res.delta.materials }
  return { ship: res.ship as Ship, resources: nextRes }
}

export function upgradeShip(
  idx: number,
  fleet: Ship[],
  blueprints: Record<FrameId, Part[]>,
  resources: Resources,
  research: Research,
  capacity: CapacityState,
  tonnageUsed: number,
  gameMode: 'single' | 'multiplayer',
  economyMods?: EconMods,
): null | { fleet: Ship[]; blueprints: Record<FrameId, Part[]>; resources: Resources } {
  const res = gameMode === 'multiplayer'
    ? upgradeAtWM(idx, fleet, blueprints, resources, { Military: research.Military || 1 } as Research, capacity, tonnageUsed, economyMods || getDefaultEconomyModifiers())
    : upgradeAt(idx, fleet, blueprints, resources, { Military: research.Military || 1 } as Research, capacity, tonnageUsed)
  if (!res) return null
  const nextFleet = fleet.map((sh, i) => (i === idx ? (res.upgraded as Ship) : sh))
  const nextRes: Resources = { ...resources, credits: resources.credits + res.delta.credits, materials: resources.materials + res.delta.materials }
  return { fleet: nextFleet, blueprints: res.blueprints as Record<FrameId, Part[]>, resources: nextRes }
}

export function upgradeDock(
  resources: Resources,
  capacity: CapacityState,
  gameMode: 'single' | 'multiplayer',
  economyMods?: EconMods,
): null | { resources: Resources; capacity: CapacityState } {
  const res = gameMode === 'multiplayer' ? expandDWM(resources, capacity, economyMods || getDefaultEconomyModifiers()) : expandD(resources, capacity)
  if (!res) return null
  const nextCap: CapacityState = { cap: res.nextCap }
  const nextRes: Resources = { ...resources, credits: resources.credits + res.delta.credits, materials: resources.materials + res.delta.materials }
  return { resources: nextRes, capacity: nextCap }
}
