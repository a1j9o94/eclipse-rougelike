import { getStep, isEnabled, type TutorialStepId } from './state'

export type Gate = {
  canBuy: boolean
  canReroll: boolean
  canUpgradeDock: boolean
  canResearch: boolean
  canUpgradeShip: boolean
  canStartCombat: boolean
  allowedBuyIds?: string[]
  allowedSellIds?: string[]
  allowedResearchTracks?: Array<'Military'|'Grid'|'Nano'>
  upgradeOnlyInterceptor?: boolean
}

export function gateFor(step: TutorialStepId): Gate {
  switch (step) {
    case 'intro-combat':     return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: false }
    case 'shop-buy-composite': return { canBuy: true,  canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true,  allowedBuyIds: ['composite'] }
    case 'combat-2':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'dock-expand':       return { canBuy: false, canReroll: false, canUpgradeDock: true,  canResearch: false, canUpgradeShip: false, canStartCombat: true }
    case 'tech-nano':         return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: true,  canUpgradeShip: false, canStartCombat: true, allowedResearchTracks: ['Nano'] }
    case 'sell-composite':    return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true, allowedSellIds: ['composite'] }
    case 'buy-improved':      return { canBuy: true,  canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true,  allowedBuyIds: ['improved'] }
    case 'tech-military':     return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: true,  canUpgradeShip: false, canStartCombat: true, allowedResearchTracks: ['Military'] }
    case 'upgrade-interceptor': return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: true,  canStartCombat: true, upgradeOnlyInterceptor: true }
    case 'enemy-intel':       return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: true }
    default:                  return { canBuy: false, canReroll: false, canUpgradeDock: false, canResearch: false, canUpgradeShip: false, canStartCombat: false }
  }
}

export function currentGate(): Gate | null {
  if (!isEnabled()) return null
  return gateFor(getStep())
}
