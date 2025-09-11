import type { TutorialStepId } from './state'

export type TutorialStep = {
  id: TutorialStepId
  anchor?: string
  copy?: string
  curatedShop?: string[]
  triggers?: string[] // event names that advance this step
}

// Initial step map (non-authoritative; refined during implementation)
export const STEPS: TutorialStep[] = [
  { id: 'intro-combat', copy: 'Your mercenary cruiser fires. Only a 6 hits with the Spike Launcher.' },
  { id: 'outpost-ship', anchor: 'ship-card', copy: 'This is your ship. Stats, hull, and slots ⬛.' },
  { id: 'outpost-blueprint', anchor: 'blueprint-panel', copy: 'Class blueprint defines default parts for this class.' },
  { id: 'shop-buy', anchor: 'shop-grid', copy: 'Buy a part to add it to the class blueprint.', curatedShop: ['fusion_source','ion_thruster','positron','plasma'], triggers: ['bought-part'] },
  { id: 'combat-2', copy: 'Test your changes in combat.' },
  { id: 'dock-expand', anchor: 'expand-dock', copy: 'Expand dock capacity to field more ships.', triggers: ['expanded-dock'] },
  { id: 'tech-research', anchor: 'research-grid', copy: 'Spend science to unlock higher-tier parts.', triggers: ['researched'] },
  { id: 'frame-upgrade', anchor: 'upgrade-ship', copy: 'Upgrade frames when Military research is high enough.', triggers: ['upgraded-frame'] },
  { id: 'enemy-intel', anchor: 'enemy-intel-btn', copy: 'Open Enemy Intel to read upcoming threats.', triggers: ['viewed-intel'] },
  { id: 'wrap', copy: 'You’re ready. Tutorial complete.' },
]

// Placeholder progression logic (filled later)
export function nextAfter(current: TutorialStepId, event?: string): TutorialStepId {
  void event; // placeholder until real progression rules are wired
  const idx = STEPS.findIndex(s => s.id === current)
  return (idx >= 0 && idx < STEPS.length - 1) ? STEPS[idx + 1].id : current
}
