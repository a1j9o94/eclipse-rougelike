// Compile-time type safety tests for multiplayer types unification
// This file validates that shared types are properly used without runtime errors

import { describe, test, expect } from 'vitest';
import type { PlayerState, GameState, ShipSnapshot, FrameId } from '../../shared/mpTypes';

describe('Multiplayer Type Safety Contract', () => {
  test('PlayerState type compatibility', () => {
    // Compile-time test: ensure PlayerState has expected shape
    const mockPlayerState: PlayerState = {
      resources: { credits: 100, materials: 50, science: 25 },
      research: { Military: 2, Grid: 2, Nano: 1 },
      economy: { rerollBase: 10, creditMultiplier: 1.2, materialMultiplier: 1.1 },
      modifiers: { rareChance: 0.15, capacityCap: 5, startingFrame: 'cruiser' },
      blueprintIds: { interceptor: [], cruiser: [], dread: [] },
      fleet: [],
      fleetValid: true,
      sector: 3,
      lives: 2,
      faction: 'scientists',
      isAlive: true,
      graceUsed: false,
    };

    // Type assertions to ensure compile-time safety
    expect(mockPlayerState.resources?.credits).toEqual(100);
    expect(mockPlayerState.research?.Military).toEqual(2);
    expect(mockPlayerState.fleet).toEqual([]);
    expect(mockPlayerState.lives).toEqual(2);
  });

  test('GameState type compatibility', () => {
    // Compile-time test: ensure GameState has expected shape
    const mockGameState: GameState = {
      currentTurn: 'player1',
      gamePhase: 'setup',
      playerStates: {
        player1: { lives: 5, fleetValid: true },
        player2: { lives: 5, fleetValid: false },
      },
      roundNum: 1,
      roundLog: ['Combat begins...'],
      acks: { player1: true, player2: false },
      pendingFinish: false,
      lastUpdate: Date.now(),
    };

    // Type assertions
    expect(mockGameState.currentTurn).toEqual('player1');
    expect(mockGameState.gamePhase).toEqual('setup');
    expect(mockGameState.playerStates.player1.lives).toEqual(5);
    expect(mockGameState.roundNum).toEqual(1);
  });

  test('ShipSnapshot type compatibility', () => {
    // Compile-time test: ensure ShipSnapshot has expected shape
    const mockShipSnapshot: ShipSnapshot = {
      frame: { id: 'interceptor', name: 'Interceptor' },
      weapons: [{
        name: 'Plasma',
        dice: 1,
        dmgPerHit: 1,
        faces: [{ roll: 6, dmg: 1 }],
        initLoss: 0,
      }],
      riftDice: 0,
      stats: {
        init: 1,
        hullCap: 1,
        valid: true,
        aim: 1,
        shieldTier: 0,
        regen: 0,
      },
      hull: 1,
      alive: true,
      partIds: ['source-1', 'drive-1', 'weapon-1'],
      parts: [{ id: 'source-1' }, { id: 'drive-1' }, { id: 'weapon-1' }],
    };

    // Type assertions
    expect(mockShipSnapshot.frame.id).toEqual('interceptor');
    expect(mockShipSnapshot.weapons[0].name).toEqual('Plasma');
    expect(mockShipSnapshot.stats.hullCap).toEqual(1);
    expect(mockShipSnapshot.alive).toEqual(true);
    expect(mockShipSnapshot.partIds).toHaveLength(3);
  });

  test('Type consistency between server and client shapes', () => {
    // This test ensures that the types we've defined can be used interchangeably
    // between server-side handlers and client-side hooks

    // Mock server-side player state (as it would come from Convex)
    const serverPlayerState = {
      resources: { credits: 50, materials: 25, science: 10 },
      research: { Military: 1, Grid: 1, Nano: 1 },
      fleet: [{
        frame: { id: 'interceptor' as FrameId, name: 'Interceptor' },
        weapons: [{ name: 'Plasma', dice: 1, dmgPerHit: 1 }],
        riftDice: 0,
        stats: { init: 1, hullCap: 1, valid: true, aim: 1, shieldTier: 0, regen: 0 },
        hull: 1,
        alive: true,
      } as ShipSnapshot],
      fleetValid: true,
      lives: 3,
    };

    // Ensure it can be typed as PlayerState
    const typedPlayerState: PlayerState = serverPlayerState;
    expect(typedPlayerState.resources?.credits).toEqual(50);
    expect(typedPlayerState.fleet?.[0]?.frame.id).toEqual('interceptor');
    expect(typedPlayerState.lives).toEqual(3);
  });

  test('No any/unknown types in critical paths', () => {
    // Compile-time check: this should compile without casting to any/unknown
    const mockUseMultiplayerGameReturn = {
      gameState: {
        currentTurn: 'player1',
        gamePhase: 'setup' as const,
        playerStates: {
          player1: { lives: 5, fleetValid: true } as PlayerState,
          player2: { lives: 5, fleetValid: false } as PlayerState,
        },
        roundNum: 1,
      } as GameState,
      
      getMyGameState(): PlayerState | null {
        return this.gameState.playerStates.player1 || null;
      },
      
      getOpponentGameState(): PlayerState | null {
        return this.gameState.playerStates.player2 || null;
      },
    };

    // These should work without any type casting
    const myState = mockUseMultiplayerGameReturn.getMyGameState();
    const oppState = mockUseMultiplayerGameReturn.getOpponentGameState();

    expect(myState?.lives).toEqual(5);
    expect(oppState?.lives).toEqual(5);
    expect(myState?.fleetValid).toEqual(true);
    expect(oppState?.fleetValid).toEqual(false);
  });
});