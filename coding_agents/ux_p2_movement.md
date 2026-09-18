# UX P2: ordered multi-route movement

## Outcome
A player can queue several fleet routes from different sources, inspect each public route, reorder or remove it, and execute all valid queued moves as one authoritative `move` command.

## Implementation evidence
- `movementPlanning.ts` introduces the public `MovementRouteDraft`, `MovementRoutePreview`, and `queuedMovementPlan` contract.
- The queue is checked in draft order. Every valid route projects its ships into a cloned `PlayerView` before the next route is derived, so a ship can be selected from the sector reached by an earlier route and pinning/range are recalculated in context.
- Invalid or stale routes stay in the queue as `rejected` previews with their reason. They cannot be executed until removed or reordered into a legal plan.
- `MovementPlanner.tsx` adds queue, remove, reorder, and one `Execute` control. It keeps the P1 single-confirmation behavior when the board has not opted into P2 route previews.
- After a queued route, the departure remains selected when another eligible public ship is still there; only the chosen ships and target clear. Execution is disabled while an unqueued selection is present.
- All route data is sector id, public ship id, destination id, and public paths derived from `PlayerView`; it contains no private state. Rules remain in the shared geometry and command processing helpers.

## Test evidence
- `src/__tests__/second_dawn_movement_planner.spec.tsx` added a fail-first projection test: a second route becomes eligible only after the first route moves the ship, while a missing/stale ship route remains rejected.
- Added reordering coverage: changing order revalidates retained drafts against the new projected public board.
- Added component coverage for queueing two different destinations into one submission, refusing execution while a selected route remains unqueued, and rejection after reordering dependent routes. The authoritative fixture remains unchanged until submission.
- Passed: `npx vitest run src/__tests__/second_dawn_movement_planner.spec.tsx --pool=forks --maxWorkers=1` (17 tests).
- Passed: `npm run typecheck -- --pretty false`.

## Board integration contract
The board persists `movementRoutes: MovementRouteDraft[]`, passes `onRoutePreview` to opt into P2, and may render the returned route previews as public ghost fleet routes. `onSelectionChange` resets source/target after a route is queued, while the planner retains the route draft for revision feedback.
