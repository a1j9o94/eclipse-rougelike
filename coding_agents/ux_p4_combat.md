# UX P4 combat implementation evidence

## Outcome

Combat allocation now presents the already-authoritative firing-group roll as one persistent volley tray. The player selects a die, selects a target, sees hit/miss reasoning and HP/damage/excess previews, can remove assignments, retains Antimatter Splitter controls, and commits once with **Resolve volley**. Natural rolls, target legality, simultaneous damage, initiative, retreat timing, and allocation validation remain engine-owned and unchanged.

## Compatibility and presentation data

`PendingDecision.combat-allocation.dice` and the persisted battle dice gained optional source ship, ship type, weapon kind/color, and computer fields. They are additive, so existing saves and currently deployed payloads remain readable. Missing provenance is labeled **Unknown weapon**; the frontend does not infer weapon identity from damage.

Resolved volleys emit an additive public `combatVolley` event containing authoritative dice, impacts, and pre/post target HP, excess, and destruction. Public history projects and renders this read-only payload, including neutral volleys. Older journal events have no structured volley and remain text-only; the client deliberately does not simulate or invent missing rolls. A backend rollout is required before newly generated live journal entries include the richer payload; frontend allocation remains fully functional against the old payload.

Animations are CSS-only and consume no RNG. Reduced-motion removes the settling animation. All required manipulation is available through labeled buttons with keyboard focus and touch-sized commit control; dragging, hover, color, and sound are not required.

## Fail-first and verification

The new volley interaction tests failed first against the prior repeated per-die target-card UI, then passed after implementation.

- `npx vitest run --maxWorkers=1 src/__tests__/second_dawn_combat_volley_ux.spec.tsx src/__tests__/second_dawn_decisions.spec.tsx src/__tests__/second_dawn_battle_engine.spec.ts src/__tests__/second_dawn_history.spec.ts` — 38 tests passed.
- `npm run typecheck:eclipse` — passed.
- Changed-file ESLint — passed.

The bounded engine suite covers persisted rolls/reconnect, natural and shield-aware hit targets, split damage, neutral allocation, retreat/initiative ordering, stale allocations, deterministic RNG draw count, additive provenance, and structured result projection. Human newcomer/expert and physical touch-device playtests remain pending and are not claimed.
