import { getStep, isEnabled, type TutorialStepId } from './state'

export type Gate = {
  canBuy: boolean
  canReroll: boolean
  canUpgradeDock: boolean
  canResearch: boolean
  canUpgradeShip: boolean
  canStartCombat: boolean
  canBuild?: boolean
  allowedBuyIds?: string[]
  allowedSellIds?: string[]
  allowedResearchTracks?: Array<'Military'|'Grid'|'Nano'>
  upgradeOnlyInterceptor?: boolean
}

export function gateFor(step: TutorialStepId): Gate {
  switch (step) {
    case 'intro-combat':     return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'shop-buy-composite-1': return { canBuy: true,  canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true,  allowedBuyIds: ['composite'] }
    case 'shop-buy-composite-2': return { canBuy: true,  canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true,  allowedBuyIds: ['composite'] }
    case 'build-interceptor': return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true, canBuild: true }
    case 'combat-2':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'dock-expand':       return { canBuy: false, canReroll: false, canUpgradeDock: true,  canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'tech-nano':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: true,  canUpgradeShip: false, canStartCombat: true, allowedResearchTracks: ['Nano'] }
    case 'tech-open':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'tech-close':        return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'sell-composite':    return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true, allowedSellIds: ['composite'] }
    case 'buy-improved':      return { canBuy: true,  canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true,  allowedBuyIds: ['improved'] }
    case 'combat-3':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'tech-military':     return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: true,  canUpgradeShip: false, canStartCombat: true, allowedResearchTracks: ['Military'] }
    case 'capacity-info':     return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'select-cruiser':    return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'upgrade-interceptor': return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: true,  canStartCombat: true, upgradeOnlyInterceptor: true }
    case 'bar-resources':     return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'bar-capacity':      return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'bar-sector':        return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'bar-lives':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'shop-reroll':       return { canBuy: false, canReroll: true,  canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'intel-open':        return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'intel-close':       return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    default:                  return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: false }
  }
}

export function currentGate(): Gate | null {
  if (!isEnabled()) return null
  return gateFor(getStep())
}
