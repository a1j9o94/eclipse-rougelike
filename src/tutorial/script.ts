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
  { id: 'intro-combat', anchor: 'start-combat', copy: 'You are a mercenary captain hired to clear hostile sectors. Each battle, ships act from highest 🚀 Initiative to lowest. Weapons roll dice; 6 hits by default. 🎯 Computers lower the roll you need to hit; 🛡️ Shields make you harder to hit. Each hit removes 1 ❤️; at 0, a ship is destroyed. Press Start Combat to begin.', triggers: ['started-combat'] },
  { id: 'outpost-ship', anchor: 'ship-card', copy: 'Tap a ship to select it. Watch ❤️ hull, ⬛ slots, and ⚡ power (right of name). Keep power usage ≤ power produced.', triggers: ['focused-ship'] },
  { id: 'outpost-blueprint', anchor: 'blueprint-panel', copy: 'Class blueprints apply to every ship of that class. Changing the blueprint changes new builds and upgrades.', triggers: ['next'] },
  // Buy Composite Hull specifically
  { id: 'shop-buy-composite', anchor: 'shop-grid', copy: 'Buy a Composite Hull. More ❤️ means more hits you can take.', curatedShop: ['composite','fusion_source','plasma','positron'], triggers: ['bought-composite'] },
  // Fight and return
  { id: 'combat-2', anchor: 'start-combat', copy: 'Press Start Combat to test your new hull.', triggers: ['post-combat'] },
  // Research Nano to unlock Improved Hull
  { id: 'tech-nano', anchor: 'research-grid', copy: 'Upgrade Nano research (🔬). 🎯 Computers help you hit; 🛡️ Shields make you harder to hit. Reroll/Research raises reroll cost for this shop.', curatedShop: ['tachyon_drive','antimatter','improved'], triggers: ['researched-nano'] },
  { id: 'tech-open', anchor: 'help-tech', copy: 'Tap Tech to open the list of all unlocks.', triggers: ['opened-tech-list'] },
  { id: 'tech-close', anchor: 'tech-close', copy: 'Close the Tech List to continue.', triggers: ['viewed-tech-list'] },
  // Swap hulls: sell Composite, then buy Improved
  { id: 'sell-composite', anchor: 'blueprint-panel', copy: 'Sell the Composite Hull from your blueprint to make room.', triggers: ['sold-composite'] },
  { id: 'buy-improved', anchor: 'shop-grid', copy: 'Buy Improved Hull (T2). +2 ❤️ for 0⚡ — a straight upgrade.', curatedShop: ['improved','fusion_source','plasma'], triggers: ['bought-improved'] },
  // Fight and return again
  { id: 'combat-3', anchor: 'start-combat', copy: 'Press Start Combat to try your upgraded hull.', triggers: ['post-combat'] },
  // Military + then expand docks for Cruiser upgrade
  { id: 'tech-military', anchor: 'research-grid', copy: 'Upgrade Military to unlock frame upgrades (Interceptor → Cruiser).', triggers: ['researched-military'] },
  { id: 'capacity-info', anchor: 'capacity-info', copy: 'Here you can see your dock capacity and how much your fleet uses. You need free capacity to field bigger ships.', triggers: ['next'] },
  { id: 'dock-expand', anchor: 'expand-dock', copy: 'Expand dock capacity so an Interceptor can upgrade into a Cruiser.', triggers: ['expanded-dock'] },
  { id: 'upgrade-interceptor', anchor: 'upgrade-ship', copy: 'Focus an Interceptor and upgrade it to a Cruiser.', triggers: ['upgraded-interceptor'] },
  // Reroll tutorial
  { id: 'shop-reroll', anchor: 'reroll-button', copy: 'Reroll the shop when nothing fits your plan. Cost rises with each Reroll/Research and resets after battle.', triggers: ['rerolled'] },
  // Intel
  { id: 'intel-open', anchor: 'enemy-intel-btn', copy: 'Open Enemy Intel to preview upcoming sectors and enemy minis.', triggers: ['opened-intel'] },
  { id: 'intel-close', anchor: 'intel-modal', copy: 'Close Enemy Intel to continue.', triggers: ['viewed-intel'] },
  { id: 'rules-hint', anchor: 'help-rules', copy: 'Any time, open Rules (❓) to review how everything works.', triggers: ['next'] },
  { id: 'wrap', copy: 'You’re ready. Tutorial complete.' },
]

// Placeholder progression logic (filled later)
export function nextAfter(current: TutorialStepId, event?: string): TutorialStepId {
  const idx = STEPS.findIndex(s => s.id === current)
  if (idx < 0) return current
  // If an event is provided, jump forward to the first later step that accepts it
  if (event) {
    for (let i = idx; i < STEPS.length; i++) {
      const s = STEPS[i]
      if (s.triggers && s.triggers.includes(event)) {
        const nextIdx = Math.min(i + 1, STEPS.length - 1)
        return STEPS[nextIdx].id
      }
    }
    return current
  }
  // Default to simple next
  return (idx < STEPS.length - 1) ? STEPS[idx + 1].id : current
}

export function curatedShopFor(step: TutorialStepId): string[] | null {
  const s = STEPS.find(x => x.id === step)
  return s?.curatedShop || null
}
