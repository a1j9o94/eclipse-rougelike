import { describe, it, expect } from 'vitest';
import {
  executeGameAction,
  validateGameAction,
  executeExplore,
  executeInfluence,
  executeResearch,
  executeUpgrade,
  executeBuild,
  executeMove,
  type ExploreAction,
  type InfluenceAction,
  type ResearchAction,
  type UpgradeAction,
  type BuildAction,
  type MoveAction,
} from '../../convex/engine/actions';
import type { Resources, Research } from '../../shared/defaults';
import type { ShipSnap } from '../../convex/engine/combat';

describe('Action System', () => {
  const mockResources: Resources = {
    credits: 20,
    materials: 10,
    science: 5,
  };

  const mockResearch: Research = {
    Military: 1,
    Grid: 1,
    Nano: 1,
  };

  const mockFleet: ShipSnap[] = [
    {
      frame: { id: 'interceptor', name: 'Interceptor' },
      weapons: [],
      riftDice: 0,
      stats: { init: 2, hullCap: 3, valid: true, aim: 1, shieldTier: 0, regen: 0 },
      hull: 3,
      alive: true,
    },
  ];

  const mockPlayerState = {
    resources: mockResources,
    research: mockResearch,
    fleet: mockFleet,
    sector: 1,
    blueprints: { interceptor: [], cruiser: [], dread: [] } as const,
  };

  describe('executeExplore', () => {
    it('should successfully execute explore action', () => {
      const action: ExploreAction = {
        type: 'explore',
        playerId: 'player1',
      };

      const result = executeExplore(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.message).toContain('explored');
    });
  });

  describe('executeInfluence', () => {
    it('should execute influence action with default values', () => {
      const action: InfluenceAction = {
        type: 'influence',
        playerId: 'player1',
      };

      const result = executeInfluence(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.message).toContain('managed influence');
      expect(result.influenceChanges).toBe(2);
    });

    it('should execute influence action with custom values', () => {
      const action: InfluenceAction = {
        type: 'influence',
        playerId: 'player1',
        discPlacements: 3,
        refreshShips: 1,
      };

      const result = executeInfluence(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.influenceChanges).toBe(3);
    });
  });

  describe('executeResearch', () => {
    it('should successfully purchase research with sufficient science', () => {
      const action: ResearchAction = {
        type: 'research',
        playerId: 'player1',
        techId: 'improved-hull',
        scienceCost: 3,
      };

      const result = executeResearch(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.resourceChanges?.science).toBe(2); // 5 - 3
      expect(result.message).toContain('researched technology');
    });

    it('should fail with insufficient science', () => {
      const action: ResearchAction = {
        type: 'research',
        playerId: 'player1',
        techId: 'advanced-tech',
        scienceCost: 10,
      };

      const result = executeResearch(action, mockPlayerState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough science');
    });
  });

  describe('executeUpgrade', () => {
    it('should successfully upgrade with sufficient materials', () => {
      const action: UpgradeAction = {
        type: 'upgrade',
        playerId: 'player1',
        frameId: 'interceptor',
        removePartIds: ['old-weapon'],
        addPartIds: ['new-weapon'],
        materialCost: 2,
      };

      const result = executeUpgrade(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.resourceChanges?.materials).toBe(8); // 10 - 2
      expect(result.message).toContain('upgraded');
    });

    it('should fail with insufficient materials', () => {
      const action: UpgradeAction = {
        type: 'upgrade',
        playerId: 'player1',
        frameId: 'cruiser',
        removePartIds: ['old-part'],
        addPartIds: ['new-part'],
        materialCost: 15,
      };

      const result = executeUpgrade(action, mockPlayerState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough materials');
    });

    it('should handle zero-cost upgrades', () => {
      const action: UpgradeAction = {
        type: 'upgrade',
        playerId: 'player1',
        frameId: 'interceptor',
        removePartIds: ['part1'],
        addPartIds: ['part2'],
        materialCost: 0,
      };

      const result = executeUpgrade(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.resourceChanges?.materials).toBe(10); // No change
    });
  });

  describe('executeBuild', () => {
    it('should successfully build ship with sufficient resources', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'ship',
        frameId: 'interceptor',
        creditCost: 5,
        materialCost: 3,
      };

      const result = executeBuild(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.resourceChanges?.credits).toBe(15); // 20 - 5
      expect(result.resourceChanges?.materials).toBe(7); // 10 - 3
      expect(result.message).toContain('built a interceptor');
    });

    it('should successfully build structure', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'structure',
        structureType: 'orbital-platform',
        creditCost: 8,
        materialCost: 4,
      };

      const result = executeBuild(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.resourceChanges?.credits).toBe(12);
      expect(result.resourceChanges?.materials).toBe(6);
      expect(result.message).toContain('built a orbital-platform');
    });

    it('should fail with insufficient credits', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'ship',
        frameId: 'dread',
        creditCost: 50,
        materialCost: 5,
      };

      const result = executeBuild(action, mockPlayerState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough credits');
    });

    it('should fail with insufficient materials', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'ship',
        frameId: 'cruiser',
        creditCost: 10,
        materialCost: 20,
      };

      const result = executeBuild(action, mockPlayerState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough materials');
    });
  });

  describe('executeMove', () => {
    it('should successfully move ship', () => {
      const action: MoveAction = {
        type: 'move',
        playerId: 'player1',
        shipId: 'ship-1',
        fromSector: 1,
        toSector: 2,
      };

      const result = executeMove(action, mockPlayerState);

      expect(result.success).toBe(true);
      expect(result.message).toContain('moved ship');
      expect(result.message).toContain('sector 1 to 2');
    });
  });

  describe('validateGameAction', () => {
    it('should validate research action with sufficient science', () => {
      const action: ResearchAction = {
        type: 'research',
        playerId: 'player1',
        techId: 'tech-1',
        scienceCost: 3,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(true);
    });

    it('should reject research action with insufficient science', () => {
      const action: ResearchAction = {
        type: 'research',
        playerId: 'player1',
        techId: 'tech-1',
        scienceCost: 10,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Not enough science');
    });

    it('should validate build action with sufficient resources', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'ship',
        frameId: 'interceptor',
        creditCost: 5,
        materialCost: 3,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(true);
    });

    it('should reject build action with insufficient credits', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'ship',
        frameId: 'dread',
        creditCost: 100,
        materialCost: 5,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not enough credits');
    });

    it('should reject build action with insufficient materials', () => {
      const action: BuildAction = {
        type: 'build',
        playerId: 'player1',
        buildType: 'ship',
        frameId: 'cruiser',
        creditCost: 10,
        materialCost: 50,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not enough materials');
    });

    it('should validate upgrade action with sufficient materials', () => {
      const action: UpgradeAction = {
        type: 'upgrade',
        playerId: 'player1',
        frameId: 'interceptor',
        removePartIds: ['part1'],
        addPartIds: ['part2'],
        materialCost: 5,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(true);
    });

    it('should reject upgrade action with insufficient materials', () => {
      const action: UpgradeAction = {
        type: 'upgrade',
        playerId: 'player1',
        frameId: 'interceptor',
        removePartIds: ['part1'],
        addPartIds: ['part2'],
        materialCost: 50,
      };

      const result = validateGameAction(action, mockPlayerState);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Not enough materials');
    });

    it('should always validate explore, influence, and move actions', () => {
      const exploreAction: ExploreAction = { type: 'explore', playerId: 'p1' };
      const influenceAction: InfluenceAction = { type: 'influence', playerId: 'p1' };
      const moveAction: MoveAction = { type: 'move', playerId: 'p1', shipId: 's1', fromSector: 1, toSector: 2 };

      expect(validateGameAction(exploreAction, mockPlayerState).valid).toBe(true);
      expect(validateGameAction(influenceAction, mockPlayerState).valid).toBe(true);
      expect(validateGameAction(moveAction, mockPlayerState).valid).toBe(true);
    });
  });

  describe('executeGameAction', () => {
    it('should route to correct handler for each action type', () => {
      const actions = [
        { type: 'explore' as const, playerId: 'p1' },
        { type: 'influence' as const, playerId: 'p1' },
        { type: 'research' as const, playerId: 'p1', techId: 't1', scienceCost: 2 },
        { type: 'upgrade' as const, playerId: 'p1', frameId: 'interceptor' as const, removePartIds: [], addPartIds: [], materialCost: 2 },
        { type: 'build' as const, playerId: 'p1', buildType: 'ship' as const, frameId: 'interceptor' as const, creditCost: 5, materialCost: 3 },
        { type: 'move' as const, playerId: 'p1', shipId: 's1', fromSector: 1, toSector: 2 },
      ];

      for (const action of actions) {
        const result = executeGameAction(action, mockPlayerState);
        expect(result.success).toBe(true);
      }
    });

    it('should preserve player state immutability', () => {
      const action: ResearchAction = {
        type: 'research',
        playerId: 'player1',
        techId: 'tech-1',
        scienceCost: 2,
      };

      const originalScience = mockPlayerState.resources.science;
      executeGameAction(action, mockPlayerState);

      // Original state should not be modified
      expect(mockPlayerState.resources.science).toBe(originalScience);
    });
  });

  describe('Integration: Full action workflow', () => {
    it('should handle sequence of actions with resource depletion', () => {
      const state = {
        resources: { credits: 30, materials: 20, science: 10 },
        research: mockResearch,
        fleet: mockFleet,
        sector: 1,
        blueprints: { interceptor: [], cruiser: [], dread: [] } as const,
      };

      // Research consumes science
      const research: ResearchAction = {
        type: 'research',
        playerId: 'p1',
        techId: 'tech1',
        scienceCost: 5,
      };
      let result = executeGameAction(research, state);
      expect(result.success).toBe(true);
      expect(result.resourceChanges?.science).toBe(5);

      // Update state manually (in real system, this would be done by game state manager)
      state.resources.science = 5;

      // Build consumes credits and materials
      const build: BuildAction = {
        type: 'build',
        playerId: 'p1',
        buildType: 'ship',
        frameId: 'interceptor',
        creditCost: 10,
        materialCost: 8,
      };
      result = executeGameAction(build, state);
      expect(result.success).toBe(true);
      expect(result.resourceChanges?.credits).toBe(20);
      expect(result.resourceChanges?.materials).toBe(12);

      // Update state
      state.resources.credits = 20;
      state.resources.materials = 12;

      // Upgrade consumes materials
      const upgrade: UpgradeAction = {
        type: 'upgrade',
        playerId: 'p1',
        frameId: 'interceptor',
        removePartIds: ['old'],
        addPartIds: ['new'],
        materialCost: 4,
      };
      result = executeGameAction(upgrade, state);
      expect(result.success).toBe(true);
      expect(result.resourceChanges?.materials).toBe(8);
    });

    it('should reject action when resources depleted', () => {
      const state = {
        resources: { credits: 5, materials: 2, science: 1 },
        research: mockResearch,
        fleet: mockFleet,
        sector: 1,
        blueprints: { interceptor: [], cruiser: [], dread: [] } as const,
      };

      // Try to build expensive ship
      const build: BuildAction = {
        type: 'build',
        playerId: 'p1',
        buildType: 'ship',
        frameId: 'dread',
        creditCost: 20,
        materialCost: 10,
      };

      const validation = validateGameAction(build, state);
      expect(validation.valid).toBe(false);

      const result = executeGameAction(build, state);
      expect(result.success).toBe(false);
    });
  });
});
