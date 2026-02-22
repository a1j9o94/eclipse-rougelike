# Eclipse Turn and Action System

## Overview

This document describes the implementation of Eclipse's turn-based action system, including the 6-phase round structure and action selection mechanics.

## Architecture

The turn system is built as a server-authoritative state machine with two main modules:

- **`convex/engine/turns.ts`**: Turn state machine, phase management, influence tracking
- **`convex/engine/actions.ts`**: Action handlers for the six Eclipse actions

## Game Structure

### Round Phases

Each round consists of 6 phases that execute in order:

1. **Action Phase** - Players take turns selecting actions
2. **Combat Phase** - Resolve all battles (existing combat.ts)
3. **Upkeep Phase** - Refresh influence discs, colony ships
4. **Income Phase** - Collect resources based on economy
5. **Cleanup Phase** - End-of-round housekeeping
6. **End Phase** - Round completion marker

After the End phase, a new round begins with the Action phase and the starting player rotates.

### Turn Order

During the Action phase:
- Players take turns in order
- Each player can take one action per turn
- Actions cost influence discs (1 disc per action)
- Players can pass when done taking actions
- After passing, players can take one reaction to other players' actions
- When all players pass, the Action phase ends

## Influence System

Players start each round with 16 influence discs on their influence track. Taking an action moves a disc from the track to the action space.

**Influence Management:**
- Start of round: 16 discs available
- Per action: -1 disc
- Pass action: 0 discs (can still react)
- Upkeep phase: All discs refresh to 16

## The Six Actions

### 1. Explore
Draw a new sector tile and place it adjacent to controlled space.

**Cost:** 1 influence disc

**Implementation:**
```typescript
type ExploreAction = {
  type: 'explore';
  playerId: string;
};
```

### 2. Influence
Pick up and place up to 2 influence discs, refresh 2 colony ships.

**Cost:** 1 influence disc

**Implementation:**
```typescript
type InfluenceAction = {
  type: 'influence';
  playerId: string;
  discPlacements?: number;  // Default: 2
  refreshShips?: number;     // Default: 2
};
```

### 3. Research
Purchase a technology tile with science.

**Cost:** 1 influence disc + science (varies by tech)

**Implementation:**
```typescript
type ResearchAction = {
  type: 'research';
  playerId: string;
  techId: string;
  scienceCost: number;
};
```

**Validation:**
- Must have sufficient science
- Technology must be available

### 4. Upgrade
Replace ship parts with better ones.

**Cost:** 1 influence disc + materials (varies)

**Implementation:**
```typescript
type UpgradeAction = {
  type: 'upgrade';
  playerId: string;
  frameId: FrameId;
  removePartIds: string[];
  addPartIds: string[];
  materialCost?: number;
};
```

**Validation:**
- Must have sufficient materials
- Parts must be valid for frame

### 5. Build
Construct ships or structures.

**Cost:** 1 influence disc + credits + materials

**Implementation:**
```typescript
type BuildAction = {
  type: 'build';
  playerId: string;
  buildType: 'ship' | 'structure';
  frameId?: FrameId;
  structureType?: string;
  creditCost: number;
  materialCost: number;
};
```

**Validation:**
- Must have sufficient credits and materials
- Must have capacity for ships

### 6. Move
Move one ship from one sector to another.

**Cost:** 1 influence disc

**Implementation:**
```typescript
type MoveAction = {
  type: 'move';
  playerId: string;
  shipId: string;
  fromSector: number;
  toSector: number;
};
```

**Validation:**
- Ship must exist and be in fromSector
- Sectors must be adjacent

## State Management

### Turn State

```typescript
type TurnState = {
  roundNum: number;
  phase: GamePhase;
  currentPlayerIndex: number;
  playerOrder: string[];
  playerActions: Record<string, PlayerActionState>;
  passedPlayers: string[];
  allPlayersPassed: boolean;
};
```

### Player Action State

```typescript
type PlayerActionState = {
  playerId: string;
  influenceAvailable: number;
  hasPassedThisRound: boolean;
  actionsThisRound: ActionType[];
  canReact: boolean;
};
```

## API

### Core Functions

#### `initializeTurnState(playerIds, roundNum, startingPlayerIndex)`
Initialize turn state for a new round.

**Returns:** `TurnState`

#### `validateAction(state, playerId, action, playerResources?)`
Validate if a player can take a specific action.

**Returns:** `ActionValidation` with `valid`, `reason?`, `cost?`

#### `executeAction(state, playerId, action)`
Execute an action and update turn state.

**Returns:** Updated `TurnState`

#### `advancePhase(state)`
Move to the next phase in the round.

**Returns:** Updated `TurnState` (or new round state if cycling)

#### `isActionPhaseComplete(state)`
Check if all players have passed.

**Returns:** `boolean`

#### `processUpkeep(state)`
Refresh influence discs and reset for next action phase.

**Returns:** Updated `TurnState`

#### `processIncome(state, playerStates)`
Calculate and distribute resources to all players.

**Returns:** `Record<string, Resources>` with updated resources per player

### Action Functions

#### `executeGameAction(action, playerState)`
Execute a specific game action.

**Returns:** `ActionResult` with `success`, `message?`, `resourceChanges?`, etc.

#### `validateGameAction(action, playerState)`
Validate action before execution.

**Returns:** `{ valid: boolean; reason?: string }`

## Example Flow

```typescript
// Initialize round
let state = initializeTurnState(['p1', 'p2'], 1);

// Player 1 explores
const valid = validateAction(state, 'p1', 'explore');
if (valid.valid) {
  state = executeAction(state, 'p1', 'explore');

  const exploreAction: ExploreAction = {
    type: 'explore',
    playerId: 'p1',
  };

  const result = executeGameAction(exploreAction, playerStates['p1']);
  // Apply result.resourceChanges to player state
}

// Player 2 researches
state = executeAction(state, 'p2', 'research');
const researchAction: ResearchAction = {
  type: 'research',
  playerId: 'p2',
  techId: 'improved-hull',
  scienceCost: 4,
};
const result = executeGameAction(researchAction, playerStates['p2']);

// Both players pass
state = executeAction(state, 'p1', 'pass');
state = executeAction(state, 'p2', 'pass');

// Action phase complete
if (isActionPhaseComplete(state)) {
  state = advancePhase(state); // → combat
  state = advancePhase(state); // → upkeep
  state = processUpkeep(state); // Refresh influence
  state = advancePhase(state); // → income
  const newResources = processIncome(state, playerStates);
  // Apply newResources to player states
  state = advancePhase(state); // → cleanup
  state = advancePhase(state); // → end
  state = advancePhase(state); // → new round
}
```

## Integration with Existing System

### Combat Phase Integration

The existing `convex/engine/combat.ts` module handles the combat phase. When the turn system advances to the combat phase:

1. Collect all ships in contested sectors
2. Run `simulateCombat()` for each battle
3. Apply combat results (ship destruction, damage)
4. Advance to upkeep phase

### Resource Management

Resources (credits, materials, science) are managed per-player in the game state. Actions that consume resources:

- **Research:** Consumes science
- **Upgrade:** Consumes materials
- **Build:** Consumes credits + materials

The income phase distributes base resources plus any bonuses from economy modifiers.

### Faction Effects

Faction-specific modifiers can affect:
- **Starting influence:** Some factions may have different influence totals
- **Action costs:** Factions could have discounts on specific actions
- **Resource multipliers:** Applied during income phase (see `processIncome`)
- **Special abilities:** Triggered during specific actions

## Testing

Comprehensive test coverage in:
- `src/__tests__/engine_turns.spec.ts` (33 tests)
- `src/__tests__/engine_actions.spec.ts` (25 tests)

**Test coverage includes:**
- Turn initialization and rotation
- Influence tracking and deduction
- Pass mechanics and reactions
- Phase advancement and round cycling
- Action validation (resources, turn order, phase)
- Action execution for all 6 action types
- Resource depletion and income
- Full round simulation with multiple players

## Future Enhancements

### Phase 1 (Minimum Viable)
- ✅ Turn state machine
- ✅ Influence tracking
- ✅ Action validation and execution
- ✅ Phase progression

### Phase 2 (Sector System)
- [ ] Sector tile deck and placement
- [ ] Adjacency validation for explore/move
- [ ] Territory control tracking

### Phase 3 (Advanced Features)
- [ ] Technology tree integration
- [ ] Structure effects (starbases, orbitals)
- [ ] Diplomatic actions
- [ ] Victory conditions

### Phase 4 (Optimization)
- [ ] Action history and replay
- [ ] AI player support
- [ ] Parallel action resolution
- [ ] Performance profiling

## References

Based on Eclipse board game rules:
- [Action Phase Rules](https://www.ultraboardgames.com/eclipse/action-phase.php)
- [Eclipse Official Rules](https://www.ultraboardgames.com/eclipse/game-rules.php)
- Eclipse: Second Dawn for the Galaxy (2nd Edition)

## Implementation Notes

### Design Decisions

1. **Server-Authoritative:** All turn logic runs on the server to prevent cheating
2. **Immutable State:** Functions return new state objects, never mutate
3. **Type Safety:** Full TypeScript types for all actions and state
4. **Testability:** Pure functions with no side effects for easy testing
5. **Modular:** Turn logic separated from action execution

### Performance Considerations

- State updates are O(1) for single actions
- Phase advancement is O(n) where n = number of players
- Income calculation is O(n) per round
- All operations suitable for real-time multiplayer

### Error Handling

Actions are validated before execution. Invalid actions return:
```typescript
{ valid: false, reason: "Error message" }
```

The system never throws exceptions during validation or execution.
