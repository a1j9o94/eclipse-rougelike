# Eclipse Roguelike → Full Game - Codebase Reference

## Quick Navigation

This guide helps developers quickly find key systems in the existing codebase.

---

## Project Structure

```
eclipse-full-game/
├── convex/                    # Backend (Convex serverless)
│   ├── schema.ts             # Database schema
│   ├── gameState.ts          # Game state queries/mutations
│   ├── rooms.ts              # Multiplayer room management
│   ├── engine/
│   │   └── combat.ts         # Combat simulation engine
│   └── helpers/              # Utility functions
├── shared/                    # Shared types/logic (client + server)
│   ├── types.ts              # Core type definitions
│   ├── game.ts               # Game configuration
│   ├── factions.ts           # Faction definitions
│   ├── parts.ts              # Ship parts catalog
│   ├── frames.ts             # Ship frames (interceptor/cruiser/dread)
│   ├── effects.ts            # Part effects system
│   ├── effectsEngine.ts      # Effect processing
│   └── economy.ts            # Resource/economy config
├── src/                       # Frontend (React + Vite)
│   ├── pages/                # Top-level pages
│   ├── components/           # React components
│   ├── hooks/                # React hooks
│   ├── game/                 # Game logic (client-side)
│   ├── engine/               # Client-side engines
│   ├── selectors/            # Data selectors
│   ├── multiplayer/          # Multiplayer UI
│   └── utils/                # Utilities
└── docs/                      # Documentation
    ├── ARCHITECTURE.md       # Full game architecture design
    ├── WORK_STREAMS.md       # Development stream breakdown
    └── CODEBASE_REFERENCE.md # This file
```

---

## Key Systems Reference

### 1. Combat System ⚔️

**Location:** `convex/engine/combat.ts`

**Purpose:** Deterministic, server-authoritative combat simulation

**Key Functions:**
- `simulateCombat(args: SimulateArgs): SimulateResult`
  - Inputs: Two fleets (ShipSnap[]), player IDs, random seed
  - Outputs: Winner, combat log, final fleet states
  - Algorithm: Initiative-based turn order, dice rolls, damage application

**Types:**
```typescript
ShipSnap: {
  frame: FrameLike          // Ship type (interceptor/cruiser/dread)
  weapons: WeaponPart[]     // Installed weapons
  riftDice: number          // Rift cannon dice
  stats: {
    init: number            // Initiative
    hullCap: number         // Max hull
    valid: boolean          // Ship loadout valid
    aim: number             // Targeting bonus
    shieldTier: number      // Shield strength
    regen: number           // Hull regeneration
  }
  hull: number              // Current hull
  alive: boolean            // Alive status
}
```

**Usage Example:**
```typescript
const result = simulateCombat({
  seed: "round-42-sector-5",
  playerAId: "player-1",
  playerBId: "player-2",
  fleetA: [ship1, ship2],
  fleetB: [ship3, ship4]
});
// result.winnerPlayerId, result.roundLog, result.finalA, result.finalB
```

**How it Works:**
1. Build initiative queue (sorted by init, ship size, random tiebreak)
2. Each ship fires at target (lowest hull for player, highest weapons for AI)
3. Roll dice, apply damage, check shields
4. Repeat until one fleet destroyed
5. Return winner and logs

**Extending for Full Game:**
- Add 3+ player support (free-for-all or pairs)
- Implement retreating
- Add sector bonuses (nebula, asteroid fields)
- Track reputation tile awards

---

### 2. Ship Building System 🚀

**Parts:** `shared/parts.ts`

**All ship components (80+ parts):**
- **Sources** - Power generators (Fusion, Tachyon, Quantum)
- **Drives** - Initiative boosters (Ion, Warp, Transition)
- **Weapons** - Damage dealers (Plasma, Antimatter, Singularity)
- **Computers** - Aim modifiers (Positron, Gluon, Neutrino)
- **Shields** - Defense (Gauss, Phase, Omega)
- **Hull** - Extra HP (Composite, Improved, Adamantine)
- **Rare** - Special effects (Rift Cannon, Disruptor, Auto-Repair)

**Part Structure:**
```typescript
Part: {
  id: string                  // Unique ID
  name: string                // Display name
  cat: PartCategory           // "Source" | "Drive" | "Weapon" | etc.
  tier: number                // 1-3
  cost: number                // Material cost
  tech_category: TechTrack    // "Military" | "Grid" | "Nano"

  // Stats (optional)
  powerProd?: number          // Power generated
  powerCost?: number          // Power consumed
  init?: number               // Initiative bonus
  dice?: number               // Attack dice
  dmgPerHit?: number          // Damage per hit
  shieldTier?: number         // Shield strength
  extraHull?: number          // Hull bonus
  aim?: number                // Aim bonus
  regen?: number              // Hull regen per round

  // Special
  faces?: DieFace[]           // Custom die faces
  riftDice?: number           // Rift cannon dice
  effects?: PartEffect[]      // Special effects
}
```

**Frames:** `shared/frames.ts`

**Ship classes:**
```typescript
Frame: {
  id: "interceptor" | "cruiser" | "dread"
  name: string
  hullBase: number            // Base hull
  slotCap: number             // Max parts
  powerBase: number           // Base power (if no sources)
  initBase: number            // Base initiative
}

FRAMES = {
  interceptor: { hullBase: 2, slotCap: 6, powerBase: 2, initBase: 3 },
  cruiser:     { hullBase: 4, slotCap: 8, powerBase: 4, initBase: 2 },
  dread:       { hullBase: 6, slotCap: 12, powerBase: 6, initBase: 1 }
}
```

**Ship Stats Calculation:**
```typescript
// Power balance
powerProd = sum(part.powerProd)
powerUse = sum(part.powerCost)
valid = powerProd >= powerUse

// Hull capacity
hullCap = frame.hullBase + sum(part.extraHull)

// Initiative
init = frame.initBase + sum(part.init)

// Aim
aim = sum(part.aim)

// Shield tier (max of all shield parts)
shieldTier = max(part.shieldTier)

// Regen
regen = sum(part.regen)
```

---

### 3. Faction System 👥

**Location:** `shared/factions.ts`

**6 Factions (roguelike):**

1. **Consortium of Scholars** (scientists)
   - All tech tracks start at Tier 2
   - Better shop quality (20% rare chance)
   - Starts: Interceptor with advanced parts

2. **Crimson Vanguard** (warmongers)
   - Starts with Cruiser
   - +2 dock capacity (14 total)
   - Military-focused

3. **Helios Cartel** (industrialists)
   - Extra credits (40) and materials (10)
   - Free rerolls
   - 25% cheaper actions

4. **Void Corsairs** (raiders)
   - Interceptors start with Tier 2 cannon
   - +1 initiative
   - Fast, aggressive playstyle

5. **Temporal Vanguard** (timekeepers)
   - Start with Disruptor Beam and Plasma
   - Advanced drives
   - Grid-focused

6. **Regenerative Swarm** (collective)
   - Auto-Repair Hull
   - Regenerating ships
   - Nano-focused

**Faction Config:**
```typescript
FactionConfig: {
  id: FactionId
  name: string
  description: string
  startingFrame: FrameId
  capacity: number              // Dock capacity
  research: {
    Military: number
    Grid: number
    Nano: number
  }
  resources: {
    credits: number
    materials: number
    science: number
  }
  rareChance: number            // Shop rare chance (0-1)
  economy: {
    rerollBase?: number         // Reroll cost override
    creditMultiplier?: number   // Action cost multiplier
    materialMultiplier?: number
  }
  blueprintIds: {
    interceptor?: string[]      // Starting part IDs
    cruiser?: string[]
    dread?: string[]
  }
  unlock?: (ctx) => boolean     // Unlock condition
}
```

**For Full Game:**
- Map roguelike factions to Eclipse factions
- Add Eclipse-specific faction abilities
- Implement faction-specific starting resources
- Add faction-specific influence disk counts

---

### 4. Multiplayer System 🌐

**Schema:** `convex/schema.ts`

**Core Tables:**

```typescript
rooms: {
  roomCode: string              // 4-character join code
  roomName: string
  isPublic: boolean
  status: "waiting" | "playing" | "finished"
  maxPlayers: number
  currentPlayers: number
  gameConfig: {
    startingShips: number
    livesPerPlayer: number
    multiplayerLossPct: number
  }
  createdAt: number
}

players: {
  roomId: Id<"rooms">
  playerId: string              // Unique player ID
  playerName: string
  faction?: string
  isHost: boolean
  lives: number
  isReady: boolean
  joinedAt: number
}

gameState: {
  roomId: Id<"rooms">
  currentTurn: string           // Current player ID
  gamePhase: "setup" | "combat" | "finished"
  playerStates: any             // Player-specific state
  combatQueue: any              // Initiative queue
  roundNum: number
  roundSeed?: string            // Combat RNG seed
  roundLog?: any                // Combat log
  acks?: any                    // Player acknowledgments
  matchResult?: {
    winnerPlayerId: string
    reason?: string
  }
  pendingFinish?: boolean
  lastUpdate: number
}
```

**Room Flow:**
1. Create room (`convex/rooms.ts:createRoom`)
2. Join room (`joinRoom`)
3. Mark ready (`markReady`)
4. Start game (host) (`startGame`)
5. Take turns (action/combat phases)
6. Finish game (`finishGame`)

**State Sync:**
- Convex reactivity (auto-updates)
- Optimistic UI updates
- Server-authoritative validation

---

### 5. Resource & Economy 💰

**Location:** `shared/economy.ts`, `shared/types.ts`

**Resources:**
```typescript
Resources: {
  credits: number
  materials: number
  science: number
}

Research: {
  Military: number              // 1-3+ (tier)
  Grid: number
  Nano: number
}

Capacity: {
  cap: number                   // Dock slots (3-14)
}

Tonnage: {
  used: number                  // Ships built
  cap: number                   // Max ships
}
```

**Economy Config:**
```typescript
ECONOMY = {
  shop: {
    itemsBase: 6,               // Shop size
    rerollBaseCost: 5,          // Reroll cost
    rerollIncrement: 2,         // Cost increase per reroll
  },
  parts: {
    tier1Chance: 0.5,
    tier2Chance: 0.35,
    tier3Chance: 0.15,
  }
}
```

**For Full Game:**
- Add money income system
- Add upkeep costs
- Add influence disk economy
- Add population cube management

---

### 6. Frontend Architecture 🎨

**Tech Stack:**
- React 18
- TypeScript
- Vite (build tool)
- Convex (backend + realtime)
- Tailwind CSS (styling)

**Key Components:**

**Pages:**
- `src/pages/RoomLobby.tsx` - Multiplayer lobby
- `src/pages/GamePage.tsx` - Main game view

**Game Components:**
- `src/components/ShipBuilder.tsx` - Ship editor
- `src/components/ShipCard.tsx` - Ship display
- `src/components/CombatLog.tsx` - Combat viewer
- `src/components/ResourcePanel.tsx` - Resources display
- `src/components/TechPanel.tsx` - Research display

**Hooks:**
- `src/hooks/useGameState.ts` - Game state query
- `src/hooks/useRoom.ts` - Room query
- `src/hooks/usePlayers.ts` - Players query

**State Management:**
- Convex queries (reactive)
- Local React state (UI-only)
- No Redux/Zustand (Convex handles global state)

---

## Testing

**Test Files:** `src/__tests__/`

**Key Test Suites:**
- Combat engine tests
- Ship stats calculation tests
- Part effect tests
- Economy tests

**Run Tests:**
```bash
npm run test       # Run all tests
npm run test:watch # Watch mode
npm run test:ui    # Vitest UI
```

---

## Development Workflow

**Setup:**
```bash
npm install
npm run dev        # Start dev server (Vite)
npx convex dev     # Start Convex backend
```

**Build:**
```bash
npm run lint       # ESLint
npm run build      # Production build
npm run preview    # Preview build
```

**Convex:**
```bash
npx convex dev     # Dev mode (auto-deploy)
npx convex deploy  # Production deploy
npx convex logs    # View logs
```

---

## Common Patterns

### Adding a New Part

1. Add to `shared/parts.ts` in appropriate category:
```typescript
export const PARTS: PartCatalog = {
  weapons: [
    // ... existing weapons
    {
      id: "my_new_weapon",
      name: "My New Weapon",
      cat: "Weapon",
      tier: 2,
      cost: 50,
      tech_category: "Nano",
      dice: 2,
      dmgPerHit: 1,
      powerCost: 2,
      faces: [{ roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 }],
      desc: "Rolls 2 dice for 1 damage each."
    }
  ]
}
```

2. Update `ALL_PARTS` array (auto-generated from catalogs)

3. Add tests in `src/__tests__/parts.test.ts`

### Adding a New Mutation

1. Create file: `convex/myFeature.ts`
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myAction = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.string(),
    // ... other args
  },
  handler: async (ctx, args) => {
    // 1. Validate
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    // 2. Execute logic
    // ...

    // 3. Update database
    await ctx.db.patch(args.roomId, { /* updates */ });

    // 4. Return result
    return { success: true };
  }
});
```

2. Call from frontend:
```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const myAction = useMutation(api.myFeature.myAction);

// In component:
await myAction({ roomId, playerId });
```

### Adding a New Query

1. Create query in Convex file:
```typescript
export const getMyData = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("myTable")
      .withIndex("by_room", q => q.eq("roomId", args.roomId))
      .collect();
  }
});
```

2. Use in frontend:
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const data = useQuery(api.myFeature.getMyData, { roomId });
// Automatically re-renders when data changes
```

---

## Key Files to Start With

**If you're working on:**

- **Galaxy/Sectors:** Start with `shared/hexGrid.ts` (create new), review `convex/schema.ts`
- **Technologies:** Start with `shared/technologies.ts` (create new), review `shared/parts.ts`
- **Resources:** Start with `convex/schema.ts` (add tables), review `shared/economy.ts`
- **Actions:** Start with `convex/actions/` (create new dir), review `convex/gameState.ts`
- **Combat:** Review `convex/engine/combat.ts` (understand existing engine)
- **Victory Points:** Start with `convex/scoring/` (create new dir)

---

## Architecture Principles

**Server-Authoritative:**
- All game logic runs on server (Convex)
- Client sends actions, server validates and executes
- Prevents cheating, ensures consistency

**Reactive UI:**
- Convex queries auto-update components
- No manual state sync needed
- Use `useQuery` for reads, `useMutation` for writes

**Deterministic Combat:**
- Seeded random numbers (reproducible)
- Same inputs → same outputs
- Enables replay and verification

**Type Safety:**
- TypeScript everywhere (shared/, convex/, src/)
- No `any` on public APIs
- Generate Convex types automatically

---

## Gotchas

**Convex:**
- Mutations can't return database IDs directly (serialize to strings)
- Queries can't modify state (read-only)
- Use indexes for performance (don't scan full tables)

**React:**
- Don't call mutations in render (use `useEffect` or event handlers)
- Don't mutate Convex query results (they're frozen)
- Use stable query args (avoid creating new objects each render)

**Combat:**
- Random seed must be deterministic (use roundNum + sectorId)
- Don't modify ShipSnap objects (clone them first)
- Initiative ties broken by ship size, then random

---

## Help & Resources

**Docs:**
- [Convex Docs](https://docs.convex.dev/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

**Internal Docs:**
- `docs/ARCHITECTURE.md` - Full game design
- `docs/WORK_STREAMS.md` - Development breakdown
- `AGENTS.md` - Agent workflow guide

**Get Help:**
- Check existing code for patterns
- Read tests for usage examples
- Ask team lead for clarification

---

**Last Updated:** February 22, 2026
