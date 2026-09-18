# Multi-activation movement — 2026-09-08

Outcome: select a ship and its final destination once, and confirm all legal Move activations needed to reach it together.

## Acceptance and rule evidence

- A speed-one ship can move two connected sectors using two activations in one command, with one influence disc for the action.
- A speed-two ship uses one activation for the same route.
- All selected ships share the remaining activation budget; distant destinations requiring too many activations are excluded.
- Connections, intermediate pinning, and movement range are checked for every segment.
- The selected route shows its real activation count, a single combined route per ship, and one final confirmation.
- History counts unique ships; repeated activations are separately identified.

The local rule audit `coding_agents/second_dawn_rules.md` references publisher rulebook page 13. The current publisher-verified [Dized Move rule](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/-kws0RYiRTu4rDs4qXyYBQ/move) gives each activation one ship's movement value; the [Action Phase quick reference](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/vU6UYhe3QsuX2-ZfUGxyHA/quick-reference-action-phase) confirms activations can move the same or different ships. Existing `shared/eclipse/actions.ts` already processes each `command.moves` entry sequentially and charges `moves.length` activations. No engine rule was changed.

## Implementation decisions

The planner uses precomputed public connection adjacency and breadth-first searches bounded by ship speed times the available activation budget. Each sector is visited at most once per search; cycles cannot expand the search. Moving ships are relocated in the planning copy while pinning is checked. Paths are split into segments at the ship's actual per-activation movement value, and every segment is validated again using the authoritative movement validator with sequential fleet positions.

Each remaining selected ship reserves at least one activation. Existing fleet-order search is retained, with its selection count bounded by the Move action capacity (four with Terran Improved Logistics). Shortest legal per-ship paths minimize required activations. Wormhole Generator, Warp Portals, Draco's Ancient exception, and cloaking/pinning remain shared geometry rules.

`MovementDestination.activations` is the generated command's actual segment count. The UI groups repeated ship IDs into one route row, uses unique ship keys, and labels ship speed as sectors per activation. Confirmation names ship count and activation count. Public history retains its previous wording when each ship uses one activation; a repeated move becomes, for example, `Moved 1 ship · 2 activations`.

## Verification

Failing-first tests cover speed-one/two behavior, one-disc cost, immutable input, insufficient remaining activations, intermediate enemy pinning, mixed-speed fleet budgets, combined route display, one confirmation, and accurate history summaries. The movement planner, history, actions, and rules batch passes 37 tests. Scoped ESLint, Eclipse TypeScript, and production build pass.

Evidence: `coding_agents/logs/second_dawn_multi_activation_move_red.out`, `second_dawn_repeated_move_history_red.out`, `second_dawn_multi_activation_move_green.out`, `second_dawn_multi_activation_move_lint.out`, `second_dawn_multi_activation_move_types.out`, and `second_dawn_multi_activation_move_build.out`.

Supervisor's independent browser agent owns visual review of the combined route fixture and final deployment. The existing recorded `workflow-move` fixture has no legal two-activation target, so it alone does not establish coverage of the new longer-route workflow.

## Risks and rollback

No schema, catalog, authoritative rule, or command-format migration is needed. Rolling back the planner removes the shortcut while preserving the engine's existing sequential activation support. The planner derives destinations only from public information; server validation remains decisive if another accepted command changes the state before submission.
