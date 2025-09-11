import type { TutorialStepId } from './state'

export type TutorialStep = {
  id: TutorialStepId
  anchor?: string
  copy?: string
  curatedShop?: string[]
  triggers?: string[] // event names that advance this step
}

// Scripted, specific path
export const STEPS: TutorialStep[] = [
  { id: 'intro-combat', copy: 'Your mercenary cruiser fires. Only a 6 hits with the Spike Launcher.' },
  { id: 'outpost-ship', anchor: 'ship-card', copy: 'This is your ship. Stats, hull, ⬛ slots, and ⚡ power.' },
  { id: 'outpost-blueprint', anchor: 'blueprint-panel', copy: 'Class blueprints add parts to all ships of this class.' },
  // Buy Composite Hull specifically
  { id: 'shop-buy-composite', anchor: 'shop-grid', copy: 'Buy a Composite Hull (adds ❤️) to your blueprint.', curatedShop: ['composite','fusion_source','plasma','positron'], triggers: ['bought-composite'] },
  // Fight and return
  { id: 'combat-2', copy: 'Test your new hull in combat.', triggers: ['post-combat'] },
  // Expand docks
  { id: 'dock-expand', anchor: 'expand-dock', copy: 'Expand dock capacity to field more ships.', triggers: ['expanded-dock'] },
  // Research Nano to unlock Improved Hull
  { id: 'tech-nano', anchor: 'research-grid', copy: 'Upgrade Nano research to unlock Improved Hull.', curatedShop: ['tachyon_drive','antimatter','improved'], triggers: ['researched-nano'] },
  // Swap hulls: sell Composite, then buy Improved
  { id: 'sell-composite', anchor: 'blueprint-panel', copy: 'Sell the Composite Hull from your blueprint.', triggers: ['sold-composite'] },
  { id: 'buy-improved', anchor: 'shop-grid', copy: 'Buy and install Improved Hull (Tier 2).', curatedShop: ['improved','fusion_source','plasma'], triggers: ['bought-improved'] },
  // Military + upgrade an interceptor to a cruiser
  { id: 'tech-military', anchor: 'research-grid', copy: 'Upgrade Military research to unlock frame upgrades.', triggers: ['researched-military'] },
  { id: 'upgrade-interceptor', anchor: 'upgrade-ship', copy: 'Focus an Interceptor and upgrade it to a Cruiser.', triggers: ['upgraded-interceptor'] },
  // Intel and wrap
  { id: 'enemy-intel', anchor: 'enemy-intel-btn', copy: 'Open Enemy Intel to read upcoming threats.', triggers: ['viewed-intel'] },
  { id: 'wrap', copy: 'You’re ready. Tutorial complete.' },
]

// Placeholder progression logic (filled later)
export function nextAfter(current: TutorialStepId, event?: string): TutorialStepId {
  const idx = STEPS.findIndex(s => s.id === current)
  if (idx < 0) return current
  const step = STEPS[idx]
  // Advance on explicit trigger or user hitting Next
  if (!event || event === 'next') return (idx < STEPS.length - 1) ? STEPS[idx + 1].id : current
  if (step.triggers && step.triggers.includes(event)) return (idx < STEPS.length - 1) ? STEPS[idx + 1].id : current
  return current
}

export function curatedShopFor(step: TutorialStepId): string[] | null {
  const s = STEPS.find(x => x.id === step)
  return s?.curatedShop || null
}
