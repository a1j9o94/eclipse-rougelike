# Resource Economy Engine - Integration API

**For:** Engine-turns agent and other system integrations
**Module:** `/workspace/group/eclipse-full-game/convex/engine/resources.ts`

## Overview

The resource economy engine provides complete resource management for Eclipse Second Dawn, including money, science, materials, population cubes, and influence disks. All functions are pure (no side effects) and return new state objects.

## Core Types

```typescript
import type {
  PlayerEconomy,
  Resources,
  ResourceType,
  Cost,
  ProductionResult,
} from '../convex/engine/resources';

// ResourceType = 'money' | 'science' | 'materials'
// Resources = { money: number; science: number; materials: number }
// Cost = Partial<Resources>
```

## Key Integration Functions

### Resource Validation & Spending

```typescript
import {
  canAfford,
  spendResources,
  addResources,
  tradeResources,
} from '../convex/engine/resources';

// Check if player can pay a cost (before taking action)
const affordable = canAfford(economy, { money: 10, science: 5 });

// Spend resources (throws if cannot afford)
const newEconomy = spendResources(economy, { materials: 3 });

// Add resources (rewards, income)
const econWithRewards = addResources(economy, { money: 10, science: 2 });

// Trade resources (2:1 default ratio)
const econAfterTrade = tradeResources(
  economy,
  'science',  // from
  'money',    // to
  3           // amount to receive (costs 6 science at 2:1)
);
```

### Influence Disk Management

```typescript
import {
  useInfluenceForAction,
  useInfluenceForSector,
  returnInfluenceFromAction,
  returnInfluenceFromSector,
  resetInfluenceAfterRound,
} from '../convex/engine/resources';

// Taking an action
const econAfterAction = useInfluenceForAction(economy);
// Moves disk from track to actions, increases upkeep cost

// Controlling a sector
const econAfterControl = useInfluenceForSector(economy);
// Moves disk from track to sectors, increases upkeep cost

// End of round cleanup
const econAfterReset = resetInfluenceAfterRound(economy);
// Returns all action disks to track, sectors remain
```

### Population & Production

```typescript
import {
  placePopulationCube,
  removePopulationCube,
  getProductionValue,
} from '../convex/engine/resources';

// Deploy population to sector
const econWithCube = placePopulationCube(economy, 'money');
// Decreases cubesRemaining, increases production

// Remove from sector (lost control)
const econWithoutCube = removePopulationCube(economy, 'materials');
// Increases cubesRemaining, decreases production

// Check current production value
const production = getProductionValue(cubesRemaining); // 0-13
```

### Upkeep Phase

```typescript
import {
  calculateProduction,
  executeUpkeep,
} from '../convex/engine/resources';

// Preview income vs upkeep (no state change)
const preview: ProductionResult = calculateProduction(economy);
// {
//   moneyIncome: 5,
//   scienceIncome: 3,
//   materialsIncome: 2,
//   upkeepCost: 10,
//   netMoney: -5  // Shortfall!
// }

// Execute upkeep phase
const result = executeUpkeep(economy);
// {
//   economy: PlayerEconomy,  // Updated state
//   production: ProductionResult,
//   shortfall: number  // Positive if cannot pay upkeep
// }

// If shortfall > 0, player must trade or lose sectors before continuing
```

### Validation

```typescript
import { validateEconomy } from '../convex/engine/resources';

const validation = validateEconomy(economy);
// {
//   valid: boolean,
//   errors: string[]  // List of validation failures
// }
```

## Integration Patterns

### Action Phase Integration

```typescript
// Example: Research action handler
export async function handleResearchAction(
  ctx,
  playerId: string,
  technologyId: string
) {
  const player = await getPlayer(ctx, playerId);
  const tech = getTechnology(technologyId);

  // 1. Check influence availability
  if (player.economy.influence.onTrack <= 0) {
    throw new Error('No influence disks available');
  }

  // 2. Check resources
  if (!canAfford(player.economy, tech.cost)) {
    throw new Error(`Cannot afford: need ${JSON.stringify(tech.cost)}`);
  }

  // 3. Use influence
  let economy = useInfluenceForAction(player.economy);

  // 4. Spend resources
  economy = spendResources(economy, tech.cost);

  // 5. Update player
  await updatePlayer(ctx, playerId, { economy });

  // 6. Grant technology
  await grantTechnology(ctx, playerId, technologyId);
}
```

### Upkeep Phase Integration

```typescript
// Example: Upkeep phase handler
export async function executeUpkeepPhase(ctx, roomId: string) {
  const players = await getPlayers(ctx, roomId);

  for (const player of players) {
    // 1. Calculate upkeep
    const result = executeUpkeep(player.economy);

    // 2. Handle shortfall
    if (result.shortfall > 0) {
      // Mark player as needing to resolve bankruptcy
      await setPlayerStatus(ctx, player.id, 'must-trade-or-lose-sectors');
      await notifyPlayer(ctx, player.id, {
        type: 'upkeep-shortfall',
        amount: result.shortfall,
      });
      continue;  // Wait for player resolution
    }

    // 3. Apply upkeep
    await updatePlayer(ctx, player.id, { economy: result.economy });
  }

  // 4. Once all players resolved, reset influence
  for (const player of players) {
    const economy = resetInfluenceAfterRound(player.economy);
    await updatePlayer(ctx, player.id, { economy });
  }
}
```

### Sector Control Integration

```typescript
// Example: Influence action (control sector)
export async function controlSector(
  ctx,
  playerId: string,
  sectorId: string
) {
  const player = await getPlayer(ctx, playerId);
  const sector = await getSector(ctx, sectorId);

  // 1. Validate can control
  if (sector.controlledBy) {
    throw new Error('Sector already controlled');
  }
  if (player.economy.influence.onTrack <= 0) {
    throw new Error('No influence available');
  }

  // 2. Use influence for sector
  const economy = useInfluenceForSector(player.economy);

  // 3. Update state
  await updatePlayer(ctx, playerId, { economy });
  await updateSector(ctx, sectorId, { controlledBy: playerId });
}

// Example: Losing sector control
export async function loseSectorControl(
  ctx,
  playerId: string,
  sectorId: string
) {
  const player = await getPlayer(ctx, playerId);
  let economy = player.economy;

  // 1. Return influence disk
  economy = returnInfluenceFromSector(economy);

  // 2. Remove population cubes (if any)
  const sector = await getSector(ctx, sectorId);
  for (const cube of sector.populationCubes) {
    economy = removePopulationCube(economy, cube.type);
  }

  // 3. Update state
  await updatePlayer(ctx, playerId, { economy });
  await updateSector(ctx, sectorId, {
    controlledBy: null,
    populationCubes: [],
  });
}
```

### Trading Integration

```typescript
// Example: Trade action
export async function tradeResources(
  ctx,
  playerId: string,
  from: ResourceType,
  to: ResourceType,
  amount: number
) {
  const player = await getPlayer(ctx, playerId);

  // Trade (throws if insufficient resources)
  const economy = tradeResources(player.economy, from, to, amount);

  await updatePlayer(ctx, playerId, { economy });

  return {
    cost: amount * player.economy.tradeRatio,
    received: amount,
  };
}
```

## Default Starting Economy

```typescript
import { DEFAULT_STARTING_ECONOMY } from '../convex/engine/resources';

// Use when creating new players
const newPlayer = {
  id: generateId(),
  economy: { ...DEFAULT_STARTING_ECONOMY },
  // ... other fields
};
```

## Faction-Specific Economies

```typescript
// Example: Faction with better trade ratio
const industrialistsEconomy: PlayerEconomy = {
  ...DEFAULT_STARTING_ECONOMY,
  tradeRatio: 1,  // 1:1 instead of 2:1
  resources: {
    money: 0,
    science: 0,
    materials: 10,  // Start with extra materials
  },
};

// Example: Faction with bonus influence
const diplomatEconomy: PlayerEconomy = {
  ...DEFAULT_STARTING_ECONOMY,
  influence: {
    onTrack: 16,  // +3 bonus disks
    onActions: 0,
    onSectors: 0,
    totalAvailable: 16,
    upkeepCost: 0,
  },
};
```

## Error Handling

All resource functions that modify state will throw descriptive errors:

```typescript
try {
  economy = spendResources(economy, cost);
} catch (error) {
  // Error message will be like:
  // "Cannot afford cost: need {money: 10, science: 5}, have {money: 3, science: 2}"
  console.error(error.message);
}

try {
  economy = useInfluenceForAction(economy);
} catch (error) {
  // "No influence disks available on track"
}

try {
  economy = placePopulationCube(economy, 'materials');
} catch (error) {
  // "No materials population cubes remaining to place"
}
```

## State Consistency

Always validate economy state after complex operations:

```typescript
function complexOperation(economy: PlayerEconomy): PlayerEconomy {
  // ... multiple state modifications

  const validation = validateEconomy(economy);
  if (!validation.valid) {
    throw new Error(`Invalid economy state: ${validation.errors.join(', ')}`);
  }

  return economy;
}
```

## Testing Your Integration

Use the test helpers:

```typescript
import {
  canAfford,
  validateEconomy,
} from '../convex/engine/resources';

// In your tests
it('should handle research action', () => {
  const economy = createTestEconomy();
  const cost = { science: 5 };

  expect(canAfford(economy, cost)).toBe(true);

  const newEconomy = spendResources(economy, cost);
  const validation = validateEconomy(newEconomy);

  expect(validation.valid).toBe(true);
  expect(newEconomy.resources.science).toBe(economy.resources.science - 5);
});
```

## Performance Notes

- All functions are O(1) operations (simple arithmetic, array lookups)
- No database queries or async operations
- Safe to call in tight loops or real-time updates
- Immutable - always returns new objects, safe for React/Convex

## Questions?

Contact the Resources agent or see:
- Full implementation: `/convex/engine/resources.ts`
- Comprehensive tests: `/src/__tests__/resources_engine.spec.ts`
- Implementation guide: `/docs/resource-economy-implementation.md`

## Colony Ships Management

```typescript
import {
  ColonyShipState,
  getAvailableColonyShips,
  useColonyShip,
  refreshColonyShips,
  addBonusColonyShip,
} from '../convex/engine/resources';

// Check available colony ships
const available = getAvailableColonyShips(economy.colonyShips);

// Use a colony ship to deploy population
const econWithShipUsed = {
  ...economy,
  colonyShips: useColonyShip(economy.colonyShips),
};

// Refresh all colony ships (done in resetInfluenceAfterRound)
const econAfterUpkeep = {
  ...economy,
  colonyShips: refreshColonyShips(economy.colonyShips),
};

// Add bonus colony ship from technology
const econWithBonus = {
  ...economy,
  colonyShips: addBonusColonyShip(economy.colonyShips),
};
```

### Colony Ship Integration Pattern

```typescript
// Example: Influence action with population deployment
export async function controlSectorWithPopulation(
  ctx,
  playerId: string,
  sectorId: string,
  resourceType: ResourceType
) {
  const player = await getPlayer(ctx, playerId);

  // 1. Check influence available
  if (player.economy.influence.onTrack <= 0) {
    throw new Error('No influence disks available');
  }

  // 2. Check colony ship available
  if (getAvailableColonyShips(player.economy.colonyShips) <= 0) {
    throw new Error('No colony ships available');
  }

  // 3. Use influence for sector control
  let economy = useInfluenceForSector(player.economy);

  // 4. Use colony ship to deploy population
  economy = {
    ...economy,
    colonyShips: useColonyShip(economy.colonyShips),
  };

  // 5. Deploy population cube
  economy = placePopulationCube(economy, resourceType);

  // 6. Update player and sector
  await updatePlayer(ctx, playerId, { economy });
  await updateSector(ctx, sectorId, {
    controlledBy: playerId,
    population: [...(sector.population || []), { type: resourceType }],
  });
}
```

### Colony Ship State

```typescript
type ColonyShipState = {
  total: number;      // Total owned (3 for most species, varies)
  available: number;  // Face-up, usable this round
  used: number;       // Face-down, used this round
}

// Standard species (Terrans): 3 colony ships
// Planta: 4 colony ships
// Some species: 2 colony ships
```

### Upkeep Phase with Colony Ships

The `resetInfluenceAfterRound()` function now also refreshes colony ships:

```typescript
// At end of round cleanup
const economy = resetInfluenceAfterRound(player.economy);
// This resets both:
// - Influence disks from actions → track
// - Colony ships used → available
```

