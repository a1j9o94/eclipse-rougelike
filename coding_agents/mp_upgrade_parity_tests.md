# MP Upgrade Parity — Tests Added

Date: 2025-09-06
Branch: feature/multi-faction-loss

## Goal
Replicate the single-player hangar upgrade tests for the multiplayer path to ensure identical behavior when:
- Seeding Cruiser blueprint from the first Interceptor upgrade
- Respecting ship parts vs. prefilled target blueprint on first-of-class
- Using the established class blueprint for subsequent upgrades
- Propagating blueprint edits to subsequent upgrades
- Seeding Dread blueprint from the first Cruiser upgrade

## What Changed
- Added `src/__tests__/mp_upgrade.spec.ts` covering the above scenarios via `upgradeShipAtWithMods` with neutral economy mods `{ credits:1, materials:1 }`.

## Result
- All new MP tests are green locally and mirror SP expectations.
- This validates the carryover logic in `src/game/hangar.ts` for MP.

## Notes
- MP still relies on server-applied class blueprints (`blueprintIds`) where available; first-of-class seeding mirrors SP unless the ship’s parts are synthetic (`mp_*`), in which case we derive from the current class blueprint to avoid polluting class blueprints with synthetic placeholders.

