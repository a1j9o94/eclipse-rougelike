import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { OutpostCommand, BuyAndInstallCmd, SellPartCmd, BuildShipCmd, UpgradeShipCmd, UpgradeDockCmd, StartCombatCmd, RerollCmd, ResearchCmd } from '../engine/commands'

export const OutpostIntents = {
  buyAndInstall(part: Part): BuyAndInstallCmd {
    return { type: 'buy_and_install', part }
  },
  sellPart(frameId: FrameId, idx: number): SellPartCmd {
    return { type: 'sell_part', frameId, idx }
  },
  buildShip(): BuildShipCmd {
    return { type: 'build_ship' }
  },
  upgradeShip(idx: number): UpgradeShipCmd {
    return { type: 'upgrade_ship', idx }
  },
  upgradeDock(): UpgradeDockCmd {
    return { type: 'upgrade_dock' }
  },
  startCombat(): StartCombatCmd {
    return { type: 'start_combat' }
  },
  reroll(): RerollCmd {
    return { type: 'reroll' }
  },
  research(track: 'Military'|'Grid'|'Nano'): ResearchCmd {
    return { type: 'research', track }
  },
} as const

export type OutpostIntentCommand = ReturnType<
  | typeof OutpostIntents.buyAndInstall
  | typeof OutpostIntents.sellPart
  | typeof OutpostIntents.buildShip
  | typeof OutpostIntents.upgradeShip
  | typeof OutpostIntents.upgradeDock
  | typeof OutpostIntents.startCombat
  | typeof OutpostIntents.reroll
  | typeof OutpostIntents.research
>

export type AnyOutpostCommand = OutpostCommand | OutpostIntentCommand
