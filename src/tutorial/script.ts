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
  { id: 'intro-combat', anchor: 'start-combat', copy: 'You are a mercenary captain on contract to clear hostile space. Battles resolve from highest 🚀 Initiative to lowest. Weapons roll dice (6 hits by default). 🎯 Computers reduce the roll you need; 🛡️ Shields make you harder to hit. Each hit deals 1 ❤️; at 0, a ship is destroyed. Tap Start Combat to begin your first skirmish.', triggers: ['started-combat'] },
  { id: 'outpost-tabs', anchor: 'frame-tabs', copy: 'Use these tabs to focus each frame. Start on Interceptor; Cruiser/Dreadnought show a Preview until unlocked.', triggers: ['next'] },
  { id: 'outpost-blueprint', anchor: 'blueprint-panel', copy: 'This class blueprint applies to every ship of the selected class. Changes affect new builds and upgrades.', triggers: ['next'] },
  // Top bar overview
  { id: 'bar-resources', anchor: 'rb-resources', copy: 'Resources keep your fleet running: 💰 Credits to buy parts, 🧱 Materials for docks and frames, 🔬 Science for Tech. You earn rewards after each battle based on what you destroy.', triggers: ['next'] },
  { id: 'bar-capacity', anchor: 'rb-capacity', copy: 'Capacity shows used/total (X/Y). Bigger frames use more tonnage. Increase capacity to add ships or make room for upgrades.', triggers: ['next'] },
  { id: 'bar-sector', anchor: 'rb-sector', copy: 'Missions: this contract runs for 10 sectors. Push forward through each mission; sector 5 and sector 10 are boss fights. Clear them all to retire with honors.', triggers: ['next'] },
  { id: 'bar-lives', anchor: 'rb-lives', copy: 'Lives: you start with 1 life on Easy. If you lose a battle, your fleet is recovered and you get one more chance to continue. At 0, the run ends.', triggers: ['next'] },
  // Buy Composite Hull specifically
  { id: 'shop-buy-composite-1', anchor: 'shop-item-composite', copy: 'Buy a Composite Hull (1/2). More ❤️ means more hits you can take.', curatedShop: ['composite','fusion_source','plasma','positron'], triggers: ['bought-composite'] },
  { id: 'shop-buy-composite-2', anchor: 'shop-item-composite', copy: 'Buy another Composite Hull (2/2).', curatedShop: ['composite','fusion_source','plasma','positron'], triggers: ['bought-composite'] },
  // Fight and return
  { id: 'combat-2', anchor: 'start-combat', copy: 'Press Start Combat to test your new hull.', triggers: ['post-combat'] },
  // Research Nano to unlock Improved Hull
  { id: 'tech-nano', anchor: 'research-grid', copy: 'Research: spend 🔬 to unlock stronger parts. Try Nano next — it leads to better hulls and advanced weapons. Note: each Reroll/Research makes the next reroll this round cost more.', curatedShop: ['tachyon_drive','antimatter','improved'], triggers: ['researched-nano'] },
  { id: 'tech-open', anchor: 'help-tech', copy: 'Tap Tech to open the list of all unlocks.', triggers: ['opened-tech-list'] },
  { id: 'tech-close', anchor: 'tech-close', copy: 'Close the Tech List to continue.', triggers: ['viewed-tech-list'] },
  // Swap hulls: sell Composite, then buy Improved
  { id: 'sell-composite', anchor: 'blueprint-panel', copy: 'Sell the Composite Hull from your class blueprint to free a slot. Blueprint parts apply to every ship of this class.', triggers: ['sold-composite'] },
  { id: 'buy-improved', anchor: 'shop-item-improved', copy: 'Buy Improved Hull (T2): +2 ❤️ for 0⚡. It’s a straight upgrade over Composite and keeps power balanced.', curatedShop: ['improved','fusion_source','plasma'], triggers: ['bought-improved'] },
  // Fight and return again
  { id: 'combat-3', anchor: 'start-combat', copy: 'Press Start Combat to try your upgraded hull.', triggers: ['post-combat'] },
  // Military + then expand docks for Cruiser upgrade
  { id: 'tech-military', anchor: 'research-grid', copy: 'Raise Military to unlock frame upgrades: Interceptor → Cruiser (requires Military ≥ 2).', triggers: ['researched-military'] },
  { id: 'capacity-info', anchor: 'capacity-info', copy: 'Capacity row: X/Y shows used/total. Cost to expand is shown next to the +.', triggers: ['next'] },
  { id: 'dock-expand', anchor: 'expand-dock', copy: 'Tap + to expand docks. You need space before an Interceptor can become a Cruiser.', triggers: ['expanded-dock'] },
  { id: 'select-cruiser', anchor: 'frame-tabs', copy: 'Select the Cruiser tab to prepare the upgrade.', triggers: ['tab-cruiser','next'] },
  { id: 'upgrade-interceptor', anchor: 'frame-action', copy: 'Upgrade to Cruiser. Watch ⬛ slots and ⚡ power after the upgrade.', triggers: ['upgraded-interceptor'] },
  // Reroll tutorial
  { id: 'shop-reroll', anchor: 'reroll-button', copy: 'Reroll shows a fresh set of parts when nothing fits. Reroll/Research increases the reroll cost this round; it resets after battle.', triggers: ['rerolled'] },
  // Intel
  { id: 'intel-open', anchor: 'enemy-intel-btn', copy: 'Open Enemy Intel to preview upcoming missions and the enemy lineup. Plan your builds with a peek ahead.', triggers: ['opened-intel'] },
  { id: 'intel-close', anchor: 'intel-modal', copy: 'Close Enemy Intel to continue with outfitting.', triggers: ['viewed-intel'] },
  { id: 'rules-hint', anchor: 'help-rules', copy: 'Need a refresher? Tap ❓ Rules any time for a quick overview.', triggers: ['opened-rules'] },
  { id: 'wrap', copy: 'You’re ready. Clear 10 missions to complete your contract — or keep pushing in Endless War.' },
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
