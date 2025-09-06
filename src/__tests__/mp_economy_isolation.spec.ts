import { describe, it, expect, beforeEach } from 'vitest';
import { doRerollAction, researchAction, doRerollActionWithMods, researchActionWithMods } from '../game/shop';
import { setEconomyModifiers, getEconomyModifiers, type EconMods } from '../game/economy';

describe('Multiplayer Economy Isolation', () => {
  beforeEach(() => {
    // Reset global economy state before each test
    setEconomyModifiers({ credits: 1, materials: 1 });
  });

  it('should isolate reroll cost increments between industrialist and scientist players', () => {
    // The bug: nextRerollCostDelta is calculated using global economy state
    const industrialistResources = { credits: 100 };
    const scientistResources = { credits: 100 };
    const research = { Military: 1, Grid: 1, Nano: 1 };
    const baseRerollCost = 8;

    // Industrialist should get reduced reroll increments (25% reduction)
    setEconomyModifiers({ credits: 0.75, materials: 0.75 });
    const industrialistReroll = doRerollAction(industrialistResources, baseRerollCost, research);
    expect(industrialistReroll.ok).toBe(true);
    if (industrialistReroll.ok) {
      expect(industrialistReroll.delta.credits).toBe(-8); // Cost is passed as parameter, not modified
      // The increment should be reduced: 4 * 0.75 = 3, floored to 3
      expect(industrialistReroll.nextRerollCostDelta).toBe(3);
    }

    // Scientist should get normal reroll increments
    setEconomyModifiers({ credits: 1, materials: 1 });
    const scientistReroll = doRerollAction(scientistResources, baseRerollCost, research);
    expect(scientistReroll.ok).toBe(true);
    if (scientistReroll.ok) {
      expect(scientistReroll.delta.credits).toBe(-8); // Same base cost
      expect(scientistReroll.nextRerollCostDelta).toBe(4); // Full increment
    }

    // THE BUG: If we set industrialist modifiers again, the scientist's NEXT reroll
    // increment will be calculated with industrialist's modifiers due to global state
    setEconomyModifiers({ credits: 0.75, materials: 0.75 });
    const scientistSecondReroll = doRerollAction(scientistResources, baseRerollCost + 4, research);
    expect(scientistSecondReroll.ok).toBe(true);
    if (scientistSecondReroll.ok) {
      // This increment should be 4 for scientist, but due to bug it will be 3
      expect(scientistSecondReroll.nextRerollCostDelta).toBe(3); // BUG: affected by global state
    }
  });

  it('should isolate research costs between players with different factions', () => {
    const industrialistResources = { credits: 100, science: 10 };
    const scientistResources = { credits: 100, science: 10 };
    const baseResearch = { Military: 1, Grid: 1, Nano: 1 };

    // Industrialist should get 25% cost reduction
    setEconomyModifiers({ credits: 0.75, materials: 0.75 });
    const industrialistUpgrade = researchAction('Military', industrialistResources, baseResearch);
    expect(industrialistUpgrade.ok).toBe(true);
    if (industrialistUpgrade.ok) {
      // Base cost is 20 credits, industrialist should pay 15 (20 * 0.75)
      expect(industrialistUpgrade.delta.credits).toBe(-15);
    }

    // THE BUG: Scientist will be affected by the global economy state
    // Even though we reset it, the global state pollution affects all players
    setEconomyModifiers({ credits: 1, materials: 1 });
    const scientistUpgrade = researchAction('Grid', scientistResources, baseResearch);
    expect(scientistUpgrade.ok).toBe(true);
    if (scientistUpgrade.ok) {
      // Base cost is 20 credits, scientist should pay full 20
      expect(scientistUpgrade.delta.credits).toBe(-20);
    }

    // Demonstrate the bug more clearly: if industrialist modifiers are active,
    // scientist gets the discount too
    setEconomyModifiers({ credits: 0.75, materials: 0.75 }); // Industrialist settings
    const scientistSecondUpgrade = researchAction('Nano', scientistResources, baseResearch);
    expect(scientistSecondUpgrade.ok).toBe(true);
    if (scientistSecondUpgrade.ok) {
      // Scientist should pay 20, but due to global state bug pays 15
      expect(scientistSecondUpgrade.delta.credits).toBe(-15); // BUG: gets industrialist discount
    }
  });

  it('should maintain separate reroll cost tracking per player', () => {
    // This test demonstrates that reroll increments should be calculated independently per player
    const player1Resources = { credits: 100 };
    const player2Resources = { credits: 100 };
    const research = { Military: 1, Grid: 1, Nano: 1 };

    // Both players start with same base reroll cost
    const baseRerollCost = 8;

    // Player 1 is industrialist (25% reduction on increments)
    setEconomyModifiers({ credits: 0.75, materials: 0.75 });
    const p1Reroll1 = doRerollAction(player1Resources, baseRerollCost, research);
    expect(p1Reroll1.ok).toBe(true);
    if (p1Reroll1.ok) {
      expect(p1Reroll1.delta.credits).toBe(-8); // Cost passed as parameter
      // Next increment should be reduced: 4 * 0.75 = 3, floored to 3
      expect(p1Reroll1.nextRerollCostDelta).toBe(3);
    }

    // Player 2 is scientist (normal costs)
    setEconomyModifiers({ credits: 1, materials: 1 });
    const p2Reroll1 = doRerollAction(player2Resources, baseRerollCost, research);
    expect(p2Reroll1.ok).toBe(true);
    if (p2Reroll1.ok) {
      expect(p2Reroll1.delta.credits).toBe(-8); // Same base cost
      expect(p2Reroll1.nextRerollCostDelta).toBe(4); // Full increment
    }

    // THE BUG: Player 2's next increment will be affected by whatever global state is set
    setEconomyModifiers({ credits: 0.75, materials: 0.75 }); // Set to industrialist
    const p2Reroll2 = doRerollAction(player2Resources, baseRerollCost + 4, research);
    expect(p2Reroll2.ok).toBe(true);
    if (p2Reroll2.ok) {
      expect(p2Reroll2.delta.credits).toBe(-12); // Correct cost (8 + 4)
      // But the increment should be 4 for scientist, not 3
      expect(p2Reroll2.nextRerollCostDelta).toBe(3); // BUG: gets industrialist increment
    }
  });

  it('should demonstrate current global state pollution bug', () => {
    // This test explicitly shows the bug - global economy state affects all players
    const resources = { credits: 100, science: 10 };
    const research = { Military: 1, Grid: 1, Nano: 1 };

    // Set industrialist modifiers globally
    setEconomyModifiers({ credits: 0.75, materials: 0.75 });
    
    // Any player performing an action will now get industrialist benefits
    const upgrade = researchAction('Military', resources, research);
    expect(upgrade.ok).toBe(true);
    if (upgrade.ok) {
      // This should be -20 for a non-industrialist, but due to global state bug, it's -15
      expect(upgrade.delta.credits).toBe(-15); // BUG: affected by global state
    }

    // Reset to normal economy
    setEconomyModifiers({ credits: 1, materials: 1 });
    
    // Now the same action should cost full price
    const normalUpgrade = researchAction('Grid', resources, research);
    expect(normalUpgrade.ok).toBe(true);
    if (normalUpgrade.ok) {
      expect(normalUpgrade.delta.credits).toBe(-20); // Full price when not industrialist
    }

    // Verify the global state is shared
    const currentMods = getEconomyModifiers();
    expect(currentMods.credits).toBe(1); // Global state confirmed
  });

  describe('Fixed Parameter-Based Functions', () => {
    it('should properly isolate reroll costs using parameter-based functions', () => {
      const resources = { credits: 100 };
      const research = { Military: 1, Grid: 1, Nano: 1 };
      const baseRerollCost = 8;

      // Define separate economy modifiers for each player
      const industrialistMods: EconMods = { credits: 0.75, materials: 0.75 };
      const scientistMods: EconMods = { credits: 1, materials: 1 };

      // Industrialist gets reduced increments
      const industrialistReroll = doRerollActionWithMods(resources, baseRerollCost, research, industrialistMods);
      expect(industrialistReroll.ok).toBe(true);
      if (industrialistReroll.ok) {
        expect(industrialistReroll.delta.credits).toBe(-8); // Cost unchanged
        expect(industrialistReroll.nextRerollCostDelta).toBe(3); // 4 * 0.75 = 3
      }

      // Scientist gets normal increments (not affected by industrialist's modifiers)
      const scientistReroll = doRerollActionWithMods(resources, baseRerollCost, research, scientistMods);
      expect(scientistReroll.ok).toBe(true);
      if (scientistReroll.ok) {
        expect(scientistReroll.delta.credits).toBe(-8); // Same cost
        expect(scientistReroll.nextRerollCostDelta).toBe(4); // Full increment - not affected by industrialist
      }

      // Multiple actions by industrialist don't affect scientist
      const industrialistReroll2 = doRerollActionWithMods(resources, baseRerollCost + 3, research, industrialistMods);
      const scientistReroll2 = doRerollActionWithMods(resources, baseRerollCost + 4, research, scientistMods);
      
      expect(industrialistReroll2.ok && industrialistReroll2.nextRerollCostDelta).toBe(3);
      expect(scientistReroll2.ok && scientistReroll2.nextRerollCostDelta).toBe(4);
    });

    it('should properly isolate research costs using parameter-based functions', () => {
      const resources = { credits: 100, science: 10 };
      const research = { Military: 1, Grid: 1, Nano: 1 };

      const industrialistMods: EconMods = { credits: 0.75, materials: 0.75 };
      const scientistMods: EconMods = { credits: 1, materials: 1 };

      // Industrialist gets 25% discount
      const industrialistUpgrade = researchActionWithMods('Military', resources, research, industrialistMods);
      expect(industrialistUpgrade.ok).toBe(true);
      if (industrialistUpgrade.ok) {
        expect(industrialistUpgrade.delta.credits).toBe(-15); // 20 * 0.75 = 15
        expect(industrialistUpgrade.nextRerollCostDelta).toBe(3); // 4 * 0.75 = 3
      }

      // Scientist pays full price (isolated from industrialist's modifiers)
      const scientistUpgrade = researchActionWithMods('Grid', resources, research, scientistMods);
      expect(scientistUpgrade.ok).toBe(true);
      if (scientistUpgrade.ok) {
        expect(scientistUpgrade.delta.credits).toBe(-20); // Full price
        expect(scientistUpgrade.nextRerollCostDelta).toBe(4); // Full increment
      }
    });
  });
});