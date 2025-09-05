# Multiplayer Implementation Plan

## Overview

Implementing multiplayer functionality for the Eclipse Roguelike game using Convex as the backend. The system will support both private shareable rooms and public matchmaking, with synchronized turn-based combat between two players.

## Current State Analysis

The game currently operates as a single-player experience with:
- Turn-based combat system in `src/game/combat.ts`
- Game state management in `src/App.tsx` using React useState
- Local storage persistence in `src/game/storage.ts`
- Configuration-driven game setup in `src/game/setup.ts`
- Difficulty settings in `src/config/difficulty.ts`

### Key Discoveries:
- Combat system uses initiative queues and turn-based resolution
- Game state is comprehensive (resources, fleet, research, blueprints)
- Existing single-player flow is well-structured and can be preserved
- Configuration system supports different starting conditions per faction

## Desired End State

A working multiplayer system where:
1. Players can create private rooms with shareable room codes
2. Public matchmaking queue exists for quick games
3. Both players start with 3 interceptors and 5 lives (configurable)
4. Turn-based combat is synchronized between players
5. Real-time updates show opponent's actions
6. Single-player mode remains fully functional

### Verification Criteria:
- Two players can join the same game room
- Combat actions are synchronized in real-time
- Player lives system works correctly
- Victory conditions trigger properly for both players

## What We're NOT Doing

- Voice/text chat functionality
- Spectator mode
- Tournaments or ranking systems
- More than 2-player games
- Real-time (non-turn-based) combat
- Mobile app optimizations beyond existing responsive design

## Implementation Approach

Following TDD approach with failing tests first, then implementation. Using Convex for real-time backend synchronization while maintaining existing game logic patterns.

## Phase 1: Convex Setup and Infrastructure

### Overview
Set up Convex backend with necessary schema and basic configuration.

### Changes Required:

#### 1. Convex Configuration
**Files**: Root level Convex setup
**Changes**: Initialize Convex project and configuration

```bash
# Install Convex
npm install convex
npx convex dev --once
```

#### 2. Environment Configuration
**File**: `.env.local` (new)
**Changes**: Add Convex environment variables

```env
VITE_CONVEX_URL=https://your-deployment-url.convex.cloud
```

#### 3. Convex Schema Definition
**File**: `convex/schema.ts` (new)
**Changes**: Define multiplayer game schema

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    roomCode: v.string(),
    roomName: v.string(),
    isPublic: v.boolean(),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    maxPlayers: v.number(),
    currentPlayers: v.number(),
    gameConfig: v.object({
      startingShips: v.number(),
      livesPerPlayer: v.number(),
    }),
    createdAt: v.number(),
  }),
  players: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    playerName: v.string(),
    isHost: v.boolean(),
    lives: v.number(),
    isReady: v.boolean(),
    joinedAt: v.number(),
  }),
  gameState: defineTable({
    roomId: v.id("rooms"),
    currentTurn: v.string(), // playerId
    gamePhase: v.union(v.literal("setup"), v.literal("combat"), v.literal("finished")),
    playerStates: v.any(), // Store individual player game states
    combatQueue: v.any(), // Initiative queue for combat
    lastUpdate: v.number(),
  }),
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Convex project initializes successfully: `npx convex dev --once`
- [ ] Schema compiles without errors: `npx convex dev --once`
- [ ] TypeScript compilation passes: `npm run build`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Convex dashboard shows tables are created
- [ ] Environment variables are properly configured
- [ ] No console errors when starting development server

---

## Phase 2: Space-Themed Room Name Generator

### Overview
Create a system for generating space-themed room names that can be customized by players.

### Changes Required:

#### 1. Room Name Generator Utility
**File**: `src/utils/roomNameGenerator.ts` (new)
**Changes**: Space-themed name generation logic

```typescript
const SPACE_ADJECTIVES = [
  'Nebular', 'Stellar', 'Cosmic', 'Galactic', 'Solar',
  'Lunar', 'Astral', 'Orbital', 'Binary', 'Quantum'
];

const SPACE_NOUNS = [
  'Nexus', 'Station', 'Outpost', 'Gateway', 'Beacon',
  'Observatory', 'Terminal', 'Junction', 'Hub', 'Sector'
];

export function generateSpaceRoomName(): string {
  const adj = SPACE_ADJECTIVES[Math.floor(Math.random() * SPACE_ADJECTIVES.length)];
  const noun = SPACE_NOUNS[Math.floor(Math.random() * SPACE_NOUNS.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${adj} ${noun} ${number}`;
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

#### 2. Room Name Generator Tests
**File**: `src/__tests__/roomNameGenerator.spec.ts` (new)
**Changes**: Test room name generation

```typescript
import { describe, it, expect } from 'vitest';
import { generateSpaceRoomName, generateRoomCode } from '../utils/roomNameGenerator';

describe('Room Name Generator', () => {
  it('should generate space-themed room names', () => {
    const name = generateSpaceRoomName();
    expect(name).toMatch(/^[A-Za-z]+ [A-Za-z]+ \d+$/);
  });

  it('should generate unique room codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    expect(codes.size).toBeGreaterThan(90); // High probability of uniqueness
  });
});
```

### Success Criteria:

#### Automated Verification:
- [ ] Unit tests pass: `npm test roomNameGenerator`
- [ ] TypeScript compilation passes: `npm run build`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Generated room names follow space theme
- [ ] Room codes are 6 characters and URL-friendly
- [ ] Multiple generations produce varied results

---

## Phase 3: Room System with Private and Public Options

### Overview
Implement room creation, joining, and management with both private shareable rooms and public matchmaking.

### Changes Required:

#### 1. Convex Room Mutations
**File**: `convex/rooms.ts` (new)
**Changes**: Room management backend logic

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createRoom = mutation({
  args: {
    roomName: v.string(),
    isPublic: v.boolean(),
    playerName: v.string(),
    gameConfig: v.object({
      startingShips: v.number(),
      livesPerPlayer: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const roomCode = generateRoomCode();
    const roomId = await ctx.db.insert("rooms", {
      roomCode,
      roomName: args.roomName,
      isPublic: args.isPublic,
      status: "waiting",
      maxPlayers: 2,
      currentPlayers: 1,
      gameConfig: args.gameConfig,
      createdAt: Date.now(),
    });

    await ctx.db.insert("players", {
      roomId,
      playerId: generatePlayerId(),
      playerName: args.playerName,
      isHost: true,
      lives: args.gameConfig.livesPerPlayer,
      isReady: false,
      joinedAt: Date.now(),
    });

    return { roomId, roomCode };
  },
});

export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("roomCode"), args.roomCode))
      .first();

    if (!room) throw new Error("Room not found");
    if (room.currentPlayers >= room.maxPlayers) throw new Error("Room full");

    await ctx.db.insert("players", {
      roomId: room._id,
      playerId: generatePlayerId(),
      playerName: args.playerName,
      isHost: false,
      lives: room.gameConfig.livesPerPlayer,
      isReady: false,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(room._id, {
      currentPlayers: room.currentPlayers + 1,
    });

    return room._id;
  },
});
```

#### 2. Multiplayer Configuration
**File**: `src/config/multiplayer.ts` (new)
**Changes**: Multiplayer-specific configuration

```typescript
export const MULTIPLAYER_CONFIG = {
  DEFAULT_STARTING_SHIPS: 3,
  DEFAULT_LIVES_PER_PLAYER: 5,
  ROOM_CODE_LENGTH: 6,
  MAX_ROOM_NAME_LENGTH: 50,
  ROOM_TIMEOUT_MINUTES: 30,
} as const;

export type MultiplayerGameConfig = {
  startingShips: number;
  livesPerPlayer: number;
};
```

### Success Criteria:

#### Automated Verification:
- [ ] Convex functions compile: `npx convex dev --once`
- [ ] TypeScript compilation passes: `npm run build`
- [ ] Unit tests for config pass: `npm test multiplayer`

#### Manual Verification:
- [ ] Can create private rooms with shareable codes
- [ ] Can create public rooms that appear in matchmaking
- [ ] Room joining works correctly with validation
- [ ] Room capacity limits are enforced

---

## Phase 4: Multiplayer Game State Synchronization

### Overview
Implement real-time synchronization of game state between players using Convex subscriptions.

### Changes Required:

#### 1. Convex Game State Mutations
**File**: `convex/gameState.ts` (new)
**Changes**: Game state synchronization logic

```typescript
export const initializeGameState = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();

    const initialPlayerStates = {};
    for (const player of players) {
      initialPlayerStates[player.playerId] = {
        resources: { credits: 20, materials: 5, science: 0 },
        fleet: [], // Will be populated with starting ships
        research: { Military: 1, Grid: 1, Nano: 1 },
        lives: player.lives,
      };
    }

    await ctx.db.insert("gameState", {
      roomId: args.roomId,
      currentTurn: players[0].playerId,
      gamePhase: "setup",
      playerStates: initialPlayerStates,
      combatQueue: [],
      lastUpdate: Date.now(),
    });
  },
});
```

#### 2. React Hook for Multiplayer State
**File**: `src/hooks/useMultiplayerGame.ts` (new)
**Changes**: Custom hook for multiplayer game state

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useMultiplayerGame(roomId: string) {
  const gameState = useQuery(api.gameState.getGameState, { roomId });
  const updateGameState = useMutation(api.gameState.updateGameState);

  return {
    gameState,
    updateGameState,
    isMyTurn: gameState?.currentTurn === localStorage.getItem('playerId'),
  };
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Convex functions compile: `npx convex dev --once`
- [ ] React hook tests pass: `npm test useMultiplayerGame`
- [ ] TypeScript compilation passes: `npm run build`

#### Manual Verification:
- [ ] Game state updates propagate to both players in real-time
- [ ] Turn management works correctly
- [ ] Player actions are synchronized without conflicts

---

## Phase 5: Multiplayer UI Components

### Overview
Create UI components for room creation, joining, and multiplayer game interface.

### Changes Required:

#### 1. Multiplayer Start Page
**File**: `src/pages/MultiplayerStartPage.tsx` (new)
**Changes**: UI for creating/joining multiplayer games

```typescript
export default function MultiplayerStartPage() {
  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Multiplayer Eclipse</h1>
        
        <div className="space-y-4">
          <button className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg">
            Create Private Room
          </button>
          <button className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg">
            Join Public Queue
          </button>
          <button className="w-full p-4 bg-purple-600 hover:bg-purple-700 rounded-lg">
            Join with Room Code
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 2. Room Lobby Component
**File**: `src/components/RoomLobby.tsx` (new)
**Changes**: Waiting room for players before game starts

```typescript
export function RoomLobby({ roomId, onStartGame }: RoomLobbyProps) {
  // Component implementation
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Component tests pass: `npm test MultiplayerStartPage`
- [ ] TypeScript compilation passes: `npm run build`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] All multiplayer UI components render correctly
- [ ] Room creation flow works end-to-end
- [ ] Room joining with codes works properly
- [ ] Public matchmaking queue functions

---

## Phase 6: Integration with Existing App

### Overview
Integrate multiplayer functionality into the existing App.tsx structure while preserving single-player mode.

### Changes Required:

#### 1. App Routing Updates
**File**: `src/App.tsx`
**Changes**: Add multiplayer mode routing

```typescript
// Add multiplayer state
const [gameMode, setGameMode] = useState<'single'|'multiplayer'>('single');
const [multiplayerRoom, setMultiplayerRoom] = useState<string|null>(null);

// Render logic updates
if (gameMode === 'multiplayer' && multiplayerRoom) {
  return <MultiplayerGamePage roomId={multiplayerRoom} />;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] All existing tests still pass: `npm test`
- [ ] TypeScript compilation passes: `npm run build`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Single-player mode continues to work unchanged
- [ ] Multiplayer mode integration is seamless
- [ ] Navigation between modes works correctly

---

## Testing Strategy

### Unit Tests:
- Room name generation logic
- Multiplayer configuration validation
- Game state synchronization functions
- React hooks for multiplayer state

### Integration Tests:
- Complete room creation and joining flow
- Game state synchronization between simulated players
- Turn-based combat in multiplayer context
- Victory/defeat conditions with lives system

### Manual Testing Steps:
1. Create a private room and verify shareable room code works
2. Test public matchmaking queue functionality
3. Play a complete multiplayer game from start to finish
4. Verify lives system and respawning works correctly
5. Test edge cases like player disconnection

## Performance Considerations

- Convex handles real-time updates efficiently
- Game state updates should be batched when possible
- Consider implementing optimistic updates for smooth UX
- Monitor Convex usage to stay within limits

## Migration Notes

No migration needed as this is a new feature addition that doesn't modify existing single-player functionality.

## References

- Original request: User specification for multiplayer with Convex
- Game architecture: `src/App.tsx`, `src/game/`
- Combat system: `src/game/combat.ts`
- Configuration system: `src/config/`