import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import type { FrameId } from '../../shared/factions';
import { SHARED_FACTIONS } from '../../shared/factions';
import type { PlayerState, GameState } from '../../shared/mpTypes';

// Silence sound during tests
vi.mock('../game/sound', () => ({
  playEffect: vi.fn(() => Promise.resolve()),
  playMusic: vi.fn(),
  stopMusic: vi.fn(),
}));

// Mock MultiplayerStartPage to immediately join a room when Multiplayer mode is selected
vi.mock('../pages/MultiplayerStartPage', async () => {
  const React = await import('react');
  function MockMultiplayerStartPage({ onRoomJoined }: { onRoomJoined: (roomId: string) => void }) {
    React.useEffect(() => { onRoomJoined('ROOM1'); }, [onRoomJoined]);
    return <div>Mock Multiplayer Start</div>;
  }
  return { default: MockMultiplayerStartPage };
});

// Provide a controlled Lobby that allows the test to advance to game phase on demand
vi.mock('../components/RoomLobby', () => ({
  RoomLobby: ({ onGameStart }: { onGameStart: () => void }) => {
    return (
      <div>
        <div>Mock Lobby</div>
        <button onClick={onGameStart}>Enter Game</button>
      </div>
    );
  },
}));

// Prepare server-like blueprint ids for the warmongers cruiser
const warmongerCruiserIds = SHARED_FACTIONS.warmongers.blueprintIds.cruiser as string[];

// Mock useMultiplayerGame to simulate authoritative server state during setup
vi.mock('../hooks/useMultiplayerGame', () => {
  const players = [
    { playerId: 'A', playerName: 'Alice', isHost: true, isReady: true, lives: 3, faction: 'warmongers' },
    { playerId: 'B', playerName: 'Bob', isHost: false, isReady: true, lives: 3, faction: 'scientists' },
  ];
  const gameState: GameState = {
    currentTurn: 'A',
    gamePhase: 'setup' as const,
    playerStates: {
      A: {
        resources: { credits: 20, materials: 5, science: 0 },
        research: { Military: 2, Grid: 1, Nano: 1 },
        economy: { rerollBase: 10, creditMultiplier: 1, materialMultiplier: 1 },
        modifiers: { startingFrame: 'cruiser' as FrameId },
        // Inline the ids to avoid hoist issues in mock factory
        blueprintIds: { interceptor: [], cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'], dread: [] },
        fleetValid: true,
        lives: 3,
        faction: 'warmongers',
        isAlive: true,
      },
      B: { lives: 3, fleetValid: true } as PlayerState,
    },
    roundNum: 1,
    roundLog: [],
    acks: { A: false, B: false },
    pendingFinish: false,
    lastUpdate: Date.now(),
  };

  return {
    useMultiplayerGame: () => ({
      roomDetails: {
        room: {
          status: 'playing',
          roomName: 'Test Room',
          roomCode: 'TEST',
          isPublic: false,
          gameConfig: { startingShips: 1, livesPerPlayer: 3 },
        },
        players,
      },
      gameState,
      isHost: () => true,
      isMyTurn: () => true,
      getCurrentPlayer: () => players[0],
      getOpponent: () => players[1],
      getMyGameState: () => (gameState.playerStates['A'] as PlayerState) || null,
      getOpponentGameState: () => (gameState.playerStates['B'] as PlayerState) || null,
      getPlayerId: () => 'A',
      // No-op actions used by App
      createRoom: async () => ({ roomId: 'ROOM1', roomCode: 'TEST', playerId: 'A' }),
      joinRoom: async () => ({ roomId: 'ROOM1', playerId: 'A' }),
      updatePlayerReady: async () => {},
      setReady: async () => {},
      updateFleetValidity: async () => {},
      startGame: async () => {},
      restartToSetup: async () => {},
      updateGameState: async () => {},
      switchTurn: async () => {},
      updateGamePhase: async () => {},
      resolveCombatResult: async () => ({ processed: true, finished: false, loserLives: 0 }),
      endCombatToSetup: async () => {},
      submitFleetSnapshot: async () => {},
      ackRoundPlayed: async () => {},
      prepareRematch: async () => {},
      setPlayerFaction: async () => {},
      isLoading: false,
      isConvexAvailable: false,
    }),
  };
});

// Capture the first OutpostPage render’s blueprints prop and expose the ids in DOM
vi.mock('../pages/OutpostPage', () => ({
  default: ({ blueprints }: { blueprints: Record<'interceptor'|'cruiser'|'dread', { id: string }[]> }) => {
    const ids = (blueprints?.cruiser || []).map(p => p.id);
    return (
      <div data-testid="outpost-first-render" data-cruiser-ids={JSON.stringify(ids)}>
        Outpost Mock
      </div>
    );
  },
}));

describe('MP blueprint mapping before first Outpost render', () => {
  beforeEach(() => {
    // Ensure player id is present (App may read it indirectly)
    window.localStorage.setItem('eclipse-player-id', 'A');
  });

  it('maps server blueprintIds to parts before switching to OUTPOST (first render)', async () => {
    vi.stubEnv('VITE_CONVEX_URL', 'http://test');
    render(<App />);
    // Open Launch → Versus → Create Game
    fireEvent.click(screen.getByRole('button', { name: /Launch/i }));
    fireEvent.click(screen.getByRole('button', { name: /Versus/i }));
    fireEvent.click(screen.getByRole('button', { name: /Create Game/i }));

    // App may skip Lobby when room is already playing; proceed to first outpost render

    // First Outpost render should already contain mapped cruiser blueprint ids
    const outpost = await screen.findByTestId('outpost-first-render');
    const cruiserIds = JSON.parse(outpost.getAttribute('data-cruiser-ids') || '[]');
    expect(cruiserIds).toEqual(warmongerCruiserIds);
  });
});
