# Automatic exhausted-action completion — September 19, 2026

## Outcome
Committing the last activation finishes the action and passes play to the next seat without requiring a redundant End action command. Human and AI commands share the authoritative behavior.

## Acceptance and timing decisions
- All six action families finish only when their actual activation count reaches zero. Remaining capacity, even with no affordable/legal current targets, stays open for an explicit finish or funding/other legal options.
- Saved exploration, control, discovery, research reward, population-return and other queued decisions resolve before automatic completion. Another seat responding to a decision must not become the origin used to advance turn order.
- User intent explicitly favors automatic advancement. Do not invent a generic completion, colonization, or diplomacy prompt. Optional free operations can be performed before committing the final activation, on a later turn, or during upkeep where already legal. Existing explicit pending choices remain intact.
- Completion performs the same end-of-action diplomacy/traitor handling as the old explicit finish. Last-Move drafts must preview betrayal against final fleet positions; crossing through an ally and ending elsewhere does not betray them.
- Legacy saved zero-capacity actions can still be explicitly finished; no save migration is needed. Failed commands never mutate/advance the saved state.
- The change alters turn bookkeeping and timing, not action capacity, influence cost, combat rolls, resources or hidden draw choice.

## Tests (fail first)
All six exhausted actions; partial capacity; full batch Move/Build/Upgrade and reactions; nested Explore/research choices; cross-seat diplomacy resolution; last-Move betrayal and its preview; already-exhausted saved actions; rejected commands remain unchanged. Relevant existing tests and AI loops must be rerun, with broad fixture changes coordinated with the parent.

## Risks and rollback
Some fixtures intentionally submit a redundant End action after exhausting capacity; update those to follow authoritative current ownership rather than weakening new behavior. AI action budgets/pacing may need to recognize completion on the last activation instead of a separate finish command. Parent owns backend/UI integration and broader gates. Reverting the central automatic completion hook restores the former flow without changing stored data formats.

## Implementation and validation
- `shared/eclipse/engine.ts`: extracted the existing finish boundary and invoked it centrally once an action reaches exactly zero and all existing saved choices finish. Explicit early End action still uses that same boundary. Return order uses the action owner even when an opponent resolved the last choice.
- `shared/eclipse/commandPreview.ts`: the last Move activation (including a full batched command) previews betrayal using final ship destinations. Transit through an allied sector that ends elsewhere remains peaceful. Preview flags population-return income uncertainty without selecting a resource.
- New behavioral suite: **24 tests**, covering all six actions for both human and AI controllers, full batches, reactions, partial capacities, nested/control/discovery/research decisions, old zero-capacity saves, illegal-command atomicity and betrayal. An existing traitor fixture was updated to assert completion on its final activation; its separate explicit early-end betrayal branch remains.
- Focused final engine/preview batch: **36 passed**. Scoped ESLint and eclipse TypeScript passed.
- Full bounded `npm run test:second-dawn`: **753 passed / 1 failed**, 142 files, 122.78 seconds. The only failure was an independently added mobile Upgrade heading capitalization assertion; parent fixed it and the complete mobile-shell file rerun passed **10/10**. No engine or AI failures remained.
- The full suite completed seeded eight-round AI games at **2, 3, 4, 5 and 6 seats**, with valid final scoring and resource/population invariants; the five-match test took 8.4 seconds. Existing all-faction conservation/replay, funding, movement, diplomacy and durable worker suites also passed.
- Logs: `coding_agents/logs/action_auto_advance_red.out`, `action_auto_advance_final.out`, `action_auto_advance_full_suite.out`, `action_auto_advance_mobile_recheck.out`. Parent owns final production build, browser release checks and deployment.

## Follow-ups
No additional engine work is required for this slice. UI handoff/copy and the user's separate fleet-inspection work are coordinated by the parent. Existing optional free-operation timing is documented above; no new end-of-action confirmation was introduced.
