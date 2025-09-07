import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { OutpostState, OutpostEnv } from './state'
import type { Research } from '../../shared/defaults'
import { buyAndInstall as buyAndInstallOp, sellPart as sellPartOp, buildShip as buildShipOp, upgradeShip as upgradeShipOp, upgradeDock as upgradeDockOp } from '../controllers/outpostController'
import { doRerollActionWithMods, doRerollAction, researchActionWithMods, researchAction } from '../game/shop'

export type BuyAndInstallCmd = { type: 'buy_and_install'; part: Part }
export type SellPartCmd = { type: 'sell_part'; frameId: FrameId; idx: number }
export type BuildShipCmd = { type: 'build_ship' }
export type UpgradeShipCmd = { type: 'upgrade_ship'; idx: number }
export type UpgradeDockCmd = { type: 'upgrade_dock' }
export type StartCombatCmd = { type: 'start_combat' }
export type RerollCmd = { type: 'reroll' }
export type ResearchCmd = { type: 'research'; track: 'Military'|'Grid'|'Nano' }

export type OutpostCommand =
  | BuyAndInstallCmd
  | SellPartCmd
  | BuildShipCmd
  | UpgradeShipCmd
  | UpgradeDockCmd
  | StartCombatCmd
  | RerollCmd
  | ResearchCmd

export type OutpostEffects = {
  startCombat?: boolean
  warning?: string
  shopItems?: Part[]
}

export function applyOutpostCommand(state: OutpostState, env: OutpostEnv, cmd: OutpostCommand): { state: OutpostState; effects?: OutpostEffects } {
  switch (cmd.type) {
    case 'buy_and_install': {
      const res = buyAndInstallOp(cmd.part, {
        gameMode: env.gameMode,
        resources: state.resources,
        fleet: state.fleet,
        focusedIndex: state.focusedIndex,
        blueprints: state.blueprints,
        economyMods: env.economyMods,
      })
      if (!res) return { state }
      return {
        state: {
          ...state,
          resources: res.resources,
          blueprints: res.blueprints,
          fleet: res.fleet,
        },
        effects: res.warning ? { warning: res.warning } : undefined,
      }
    }
    case 'sell_part': {
      const res = sellPartOp(cmd.frameId, cmd.idx, state.blueprints, state.resources, state.fleet)
      if (!res) return { state }
      return { state: { ...state, resources: res.resources, blueprints: res.blueprints, fleet: res.fleet } }
    }
    case 'build_ship': {
      const res = buildShipOp(state.blueprints, state.resources, state.tonnageUsed, state.capacity, env.gameMode, env.economyMods)
      if (!res) return { state }
      const nextFleet = [...state.fleet, res.ship]
      return { state: { ...state, resources: res.resources, fleet: nextFleet, focusedIndex: state.fleet.length } }
    }
    case 'upgrade_ship': {
      const res = upgradeShipOp(cmd.idx, state.fleet, state.blueprints, state.resources, state.research, state.capacity, state.tonnageUsed, env.gameMode, env.economyMods)
      if (!res) return { state }
      return { state: { ...state, resources: res.resources, blueprints: res.blueprints, fleet: res.fleet } }
    }
    case 'upgrade_dock': {
      const res = upgradeDockOp(state.resources, state.capacity, env.gameMode, env.economyMods)
      if (!res) return { state }
      return { state: { ...state, resources: res.resources, capacity: res.capacity } }
    }
    case 'start_combat':
      return { state, effects: { startCombat: true } }
    case 'reroll': {
      const rr = typeof state.rerollCost === 'number' ? state.rerollCost : 8
      const useMods = env.gameMode === 'multiplayer'
      const res = useMods
        ? doRerollActionWithMods({ credits: state.resources.credits }, rr, state.research, env.economyMods!)
        : doRerollAction({ credits: state.resources.credits }, rr, state.research)
      if (!res.ok) return { state }
      const next = { ...state }
      next.resources = { ...next.resources, credits: next.resources.credits + res.delta.credits }
      next.rerollCost = rr + res.nextRerollCostDelta
      next.shopVersion = (next.shopVersion || 0) + 1
      return { state: next, effects: { shopItems: res.items } }
    }
    case 'research': {
      const useMods = env.gameMode === 'multiplayer'
      const res = useMods
        ? researchActionWithMods(cmd.track, { credits: state.resources.credits, science: state.resources.science }, state.research, env.economyMods!)
        : researchAction(cmd.track, { credits: state.resources.credits, science: state.resources.science }, state.research)
      if (!res.ok) return { state }
      const next = { ...state }
      const nextResearch = { ...next.research, [cmd.track]: res.nextTier } as Research
      next.research = nextResearch
      next.resources = { ...next.resources, credits: next.resources.credits + res.delta.credits, science: next.resources.science + res.delta.science }
      const rr = typeof next.rerollCost === 'number' ? next.rerollCost : 8
      next.rerollCost = rr + res.nextRerollCostDelta
      next.shopVersion = (next.shopVersion || 0) + 1
      return { state: next, effects: { shopItems: res.items } }
    }
    default:
      return { state }
  }
}
