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
  { id: 'intro-combat', copy: 'You are a mercenary captain hired to clear hostile sectors. You command a wing of Interceptors with standard gear. In combat, each die hits on 6 (Aim lowers the needed roll; Shields raise it). Watch the rolls, then we’ll head to the outpost.' },
  { id: 'outpost-ship', anchor: 'ship-card', copy: 'Your selected ship. Ships act from highest 🚀 to lowest. Each hit removes 1 ❤️; at 0, the ship is destroyed.' },
  { id: 'outpost-blueprint', anchor: 'blueprint-panel', copy: 'Class blueprints apply to every ship of that class. ⚡ Power must cover your parts.' },
  // Buy Composite Hull specifically
  { id: 'shop-buy-composite', anchor: 'shop-grid', copy: 'Buy a Composite Hull. More ❤️ means more hits you can take.', curatedShop: ['composite','fusion_source','plasma','positron'], triggers: ['bought-composite'] },
  // Fight and return
  { id: 'combat-2', anchor: 'start-combat', copy: 'Press Start Combat to test your new hull.', triggers: ['post-combat'] },
  // Expand docks
  { id: 'dock-expand', anchor: 'expand-dock', copy: 'Expand dock capacity to fit more tonnage in your hangar.', triggers: ['expanded-dock'] },
  // Research Nano to unlock Improved Hull
  { id: 'tech-nano', anchor: 'research-grid', copy: 'Upgrade Nano research (🔬). 🎯 Computers help you hit; 🛡️ Shields make you harder to hit. Reroll/Research raises reroll cost for this shop.', curatedShop: ['tachyon_drive','antimatter','improved'], triggers: ['researched-nano'] },
  { id: 'tech-list', anchor: 'help-tech', copy: 'Open the Tech List to see everything unlockable on each track. Close it to continue.', triggers: ['viewed-tech-list'] },
  // Swap hulls: sell Composite, then buy Improved
  { id: 'sell-composite', anchor: 'blueprint-panel', copy: 'Sell the Composite Hull from your blueprint to make room.', triggers: ['sold-composite'] },
  { id: 'buy-improved', anchor: 'shop-grid', copy: 'Buy Improved Hull (T2). +2 ❤️ for 0⚡. Stronger than Composite.', curatedShop: ['improved','fusion_source','plasma'], triggers: ['bought-improved'] },
  // Military + upgrade an interceptor to a cruiser
  { id: 'tech-military', anchor: 'research-grid', copy: 'Upgrade Military to unlock frame upgrades (Interceptor → Cruiser).', triggers: ['researched-military'] },
  { id: 'upgrade-interceptor', anchor: 'upgrade-ship', copy: 'Focus an Interceptor and upgrade it to a Cruiser.', triggers: ['upgraded-interceptor'] },
  { id: 'shop-reroll', anchor: 'reroll-button', copy: 'Reroll the shop when nothing fits your plan. Cost rises with each Reroll/Research and resets after battle.', triggers: ['rerolled'] },
  // Intel and wrap
  { id: 'enemy-intel', anchor: 'enemy-intel-btn', copy: 'Open Enemy Intel to preview upcoming sectors and enemy minis.', triggers: ['viewed-intel'] },
  { id: 'rules-hint', anchor: 'help-rules', copy: 'Any time, open Rules (❓) to review how everything works.', triggers: ['next'] },
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
