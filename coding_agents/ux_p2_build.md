# Second Dawn UX P2 — build-first deployment

## Outcome

Build is one persistent workspace: choose tangible ships and structures, distribute each piece across controlled sectors, revise the order, fund it, and commit one atomic command.

## Acceptance criteria

- The piece tray exists before any destination choice and keeps explicit unplaced items.
- Each order item has a stable identity, can be selected, placed, relocated, returned to the tray, or removed without clearing other pieces.
- Repeated map or sector-target placements advance through unplaced pieces.
- The whole draft enforces Build capacity, ship supply, technology requirements, per-sector structure uniqueness, aggregate materials, and atomic funding.
- Capability cards show current installed hull, movement, initiative, computer, shield, weapons, cost, and remaining ship supply.
- The planner publishes legal targets and the entire ghost queue for Galaxy integration; serial placement requests accept repeated clicks on one sector.
- A stale persisted draft remains visible but cannot submit until reviewed. Accepted matching receipts clear it through the shared draft provider.
- Commit states the exact piece count and materials; successful submission remains one `build` or `trade-and-act` command.

## Interfaces

`BuildPlanner` retains its prior required props and adds optional `embedded`, `placementRequest`, `onPlacementPreview`, and `onLegalTargetsChange` props. `BuildPlacementPreview` includes the selected item, legal sectors, selected ID, and every queued item for map ghosts.

The shared persisted key is `buildOrder: BuildOrderDraft`, with `{ items, selectedItemId, fundingKey }`. The parent integration owns the storage validator and receipt-driven clearing. The old `buildSector`, `buildCounts`, and `buildFunding` values are no longer read by the planner.

## Test evidence

- `npx vitest run --pool=threads --maxWorkers=1 src/__tests__/second_dawn_build_planning.spec.ts src/__tests__/second_dawn_build_planner.spec.tsx src/__tests__/second_dawn_action_drafts.spec.tsx` — 16 tests passed.
- `npm run typecheck:eclipse` — passed.
- Changed-file ESLint — passed after removing hook dependency warnings.

The tests cover independent multi-sector placement, relocation, explicit unplaced state, aggregate structure conflicts, atomic engine acceptance, conversion funding, map ghost/target callbacks, serial map placement, capability/blocker presentation, removal, stale refresh/review, and eliminated/disconnected gating.

## Risks and rollback

The UI derives legal targets from the same public view facts the engine validates, but the engine remains authoritative at submission. Remote revisions deliberately preserve the draft for review rather than silently rewriting it. The P2 planner and pure helper can be reverted without changing engine rules, saves, RNG, or multiplayer projections.

## Remaining review

Parent integration supplies the embedded map layout, ghost rendering, map click serials, and accepted-result payoff. Browser/device and newcomer/expert human playtests remain required before experiential acceptance is claimed.

## Integration review — 2026-09-18

The integrated Board/Galaxy path was reviewed with bounded desktop and mobile suites. Global Build starts with unplaced pieces; the explicit `defaultPlacementSectorId` prop lets only the Board’s Build-here shortcut auto-place a newly added item, and only when the aggregate planner marks that sector legal. Map clicks retain serial placement, switching to Move and back preserves the build order, FleetInspection returns to the same plan, and the mobile build tray stays visible beneath the galaxy while the old detail sheet stays closed.

Evidence: 36 broader Board/Galaxy/mobile/draft tests were run initially; one legacy modal expectation failed and was updated to the intended embedded build workspace. The focused integration rerun passed 19/19 tests, and the combined build/colonization/mobile rerun passed 27/27 tests. Changed-file ESLint and `typecheck:eclipse` passed. Receipt-lag disabling and accepted-draft clearing remain covered by the movement continuity and action-draft suites. A separate Board exploration-location issue was reported to the parent for correction.
