import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { OutpostState, OutpostEnv } from './state'
import { buyAndInstall as buyAndInstallOp, sellPart as sellPartOp, buildShip as buildShipOp, upgradeShip as upgradeShipOp, upgradeDock as upgradeDockOp } from '../controllers/outpostController'

export type BuyAndInstallCmd = { type: 'buy_and_install'; part: Part }
export type SellPartCmd = { type: 'sell_part'; frameId: FrameId; idx: number }
export type BuildShipCmd = { type: 'build_ship' }
export type UpgradeShipCmd = { type: 'upgrade_ship'; idx: number }
export type UpgradeDockCmd = { type: 'upgrade_dock' }
export type StartCombatCmd = { type: 'start_combat' }

export type OutpostCommand =
  | BuyAndInstallCmd
  | SellPartCmd
  | BuildShipCmd
  | UpgradeShipCmd
  | UpgradeDockCmd
  | StartCombatCmd

export type OutpostEffects = {
  startCombat?: boolean
  warning?: string
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
    default:
      return { state }
  }
}
