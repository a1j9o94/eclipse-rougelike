# Economy Isolation Bug - Multiplayer Cross-Contamination

## Summary
The economy modifiers system has regressed in multiplayer mode. Faction-specific economy settings (credit/material multipliers and free rerolls) are applying to both players instead of being isolated per faction. This was working previously but has broken again.

## Problem Description
- **Observed**: Player 1 (warmongers) and Player 2 (industrialists) both show "Reroll (0¢)" instead of warmongers having normal reroll costs
- **Expected**: Only industrialists should have free rerolls (rerollBase: 0); warmongers should have normal costs
- **Impact**: Economy modifiers from one faction affect all players in the multiplayer session

## Root Cause Analysis

### Primary Issue: Global State Contamination
The bug occurs in `src/App.tsx:604`:
```typescript
setEconomyModifiers({ credits: econ.creditMultiplier ?? 1, materials: econ.materialMultiplier ?? 1 });
```

This calls a global setter that modifies shared state (`ECON_MOD` in `src/game/economy.ts:4`) affecting ALL players.

### Architecture Problem
The codebase has mixed architecture:
- **New (correct)**: Multiplayer-isolated functions like `getCurrentPlayerEconomyMods()`, `doRerollActionWithMods()`
- **Legacy (problematic)**: Global state functions that contaminate across players

### State Synchronization Issue
When players change factions during setup, the App.tsx effect (lines 590-610) applies faction economy settings. The last player to change faction overwrites the global economy settings for everyone.

## Single Player vs Multiplayer Differences

### Single Player (Working)
- Uses global economy state via `setEconomyModifiers()`
- Works fine since there's only one player
- Legacy functions like `doRerollAction()` use `getEconomyModifiers()`

### Multiplayer (Broken)
- Should use isolated per-player economy state
- Has proper isolation functions but still calls global setter
- Functions like `doRerollActionWithMods()` accept economy mods as parameters

## Code Investigation

### Key Files and Functions

#### `src/App.tsx`
- **Line 604**: Problematic global `setEconomyModifiers()` call
- **Lines 310-327**: `getCurrentPlayerEconomyMods()` - Correct multiplayer isolation
- **Lines 330-340**: `doReroll()` - Uses multiplayer-aware functions
- **Lines 598-601**: `setBaseRerollCost()` - Correctly isolated per player

#### `src/game/economy.ts`
- **Line 4**: Global `ECON_MOD` state that causes contamination  
- **Lines 6-11**: `setEconomyModifiers()` - Global setter (problematic)
- **Lines 16-22**: New isolation functions (correct approach)

#### `src/game/shop.ts`
- **Lines 55-58**: `doRerollAction()` - Uses global state (single-player)
- **Lines 61-66**: `doRerollActionWithMods()` - Uses parameter state (multiplayer)

## Evidence from Screenshots
1. **Player 1 (warmongers)**: Shows "Reroll (0¢)" but should have normal costs
2. **Player 2 (industrialists)**: Shows "Reroll (0¢)" which is correct for their faction
3. **Both players affected**: Confirms global state contamination

## Previous Work Done
- Multiplayer isolation infrastructure already exists
- Functions like `getCurrentPlayerEconomyMods()` properly extract per-player economy settings
- Test file `src/__tests__/mp_economy_isolation.spec.ts` has comprehensive test cases

## Recommended Fix

### Primary Fix
Remove the global `setEconomyModifiers()` call in multiplayer mode:

```typescript
// In src/App.tsx around line 604
if (econ && (typeof econ.creditMultiplier === 'number' || typeof econ.materialMultiplier === 'number')) {
  // Only set global economy for single-player mode
  if (gameMode !== 'multiplayer') {
    setEconomyModifiers({ credits: econ.creditMultiplier ?? 1, materials: econ.materialMultiplier ?? 1 });
  }
  factionsApplied = true;
}
```

### Why This Works
- Multiplayer already uses `getCurrentPlayerEconomyMods()` to get per-player settings
- Single-player continues using global state as before
- No other changes needed - the isolation infrastructure exists

## Testing Strategy

### Required Tests
1. **Multiplayer isolation**: Verify warmongers (1.0x) and industrialists (0.75x) have different costs
2. **Reroll base isolation**: Confirm only industrialists get free rerolls
3. **Single-player compatibility**: Ensure global economy state still works
4. **Cross-contamination prevention**: Multiple faction changes don't affect other players

### Existing Test Coverage
The file `src/__tests__/mp_economy_isolation.spec.ts` already has comprehensive tests demonstrating the isolation requirements.

### Manual Testing
1. Create multiplayer game with warmongers vs industrialists
2. Verify warmongers have normal reroll costs
3. Verify industrialists have free rerolls (0¢)
4. Test faction switching doesn't contaminate the other player

## Implementation Notes

### Faction Economy Settings
From `shared/factions.ts:81`:
- **Industrialists**: `{ rerollBase: 0, creditMultiplier: 0.75, materialMultiplier: 0.75 }`
- **Warmongers**: `{}` (defaults: rerollBase varies, multipliers 1.0x)

### Key Insight
The `rerollBase` (free rerolls) is already correctly isolated via local state (`setBaseRerollCost`, `setRerollCost`). Only the multipliers are contaminated via global state.

## Risk Assessment
- **Low risk**: The fix is surgical and doesn't change the multiplayer isolation logic
- **Backward compatibility**: Single-player mode continues working unchanged  
- **Well-tested**: Existing test suite covers the isolation requirements

## Success Criteria
1. Warmongers show normal reroll costs (not 0¢)
2. Industrialists continue showing 0¢ rerolls
3. Material/credit costs vary by faction (0.75x vs 1.0x)
4. Single-player economy behavior unchanged
5. All existing tests pass