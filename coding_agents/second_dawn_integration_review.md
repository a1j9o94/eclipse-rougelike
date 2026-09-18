# Independent rules integration review — 2026-09-07

Outcome: legal colony, influence, upgrade and action workflows preserve the published rules through authoritative commands, with unchanged state on rejected commands and conserved finite supplies over complete matches.

Reviewed `setup.ts`, `actions.ts`, `decisions.ts`, `engine.ts`, and supporting rules state against the publisher-linked 2021-04-27 rulebook pp.4–15. Re-read p.15 before evaluating diplomacy: aggression occurs at the end of the Action; passing through an allied occupied sector while unpinned is explicitly permitted. Current end-action aggression timing is therefore correct, rather than an error.

## Findings and fixes

1. **Confirmed influence transfer defect, fixed.** A direct disc transfer from the player's sole controlled source to a connected empty sector was rejected because all sources were abandoned before additions were checked. Publisher p.14 explicitly permits transferring a disc from a sector. The command-level regression failed first (`coding_agents/logs/second-dawn-integration-review-red.out`). The owned Influence case now processes each paired activation: validate the destination while the source is still controlled, abandon and return its population, then place that disc on the destination. Per-action touched-sector tracking and once-only colony refresh are preserved.
2. **Confirmed installed ancient-part relocation defect, root fixed.** Publisher p.12 removes an ancient part from the game when it leaves its slot. Root added slot-preservation validation; the new regression verifies same-blueprint relocation is rejected and input state remains unchanged.
3. **Reviewed colony handling.** Duplicate placements reject atomically. Advanced gray squares require the chosen resource's advanced technology or Metasynthesis. Abandoned gray-square cubes may return to another track. Action-phase colony use is allowed in controlled sectors despite enemy ships; the no-opponent restriction applies specifically to upkeep. These cases match pp.8/14/24.
4. **Reviewed split-command limits.** A third build after spending two activations is rejected; commands cannot reset their open action budget.
5. **Escalated discovery/portal edge cases.** Independent review noted cheapest free technology on a full track and portal placement with no currently eligible sectors. The parallel rules-audit agent had independently identified these and root owns the fixes. Publisher p.9 specifies globally cheapest unowned regular technology, not a license to choose a pricier available technology; p.11 permits a portal on any controlled sector. This review did not silently introduce alternate rules.
6. **Completed tactical initiative correction.** On root request, `battleEngine.ts` now permits reordering same-owner tied ship types every engagement and independently for missiles. Destroyed types and types without missiles do not cause irrelevant missile-order prompts. The new regression failed before the change. Battle tests now total 19 passing.

## Verification

- Six targeted command-level tests pass in `src/__tests__/second_dawn_integration_review.spec.ts`.
- Existing five full-match seeds at 2–6 seats pass after the Influence fix.
- Twelve additional full matches, one led by every base alien and Terran faction, pass with distinct fixed seeds, player counts 2–6, and Warp Portals both enabled and disabled (`src/__tests__/second_dawn_conservation_review.spec.ts`). Each command is applied to a parallel replay state and compared for exact equality.
- Every accepted command checks: all 43 sector tiles partitioned uniquely among board/stacks/discards/box/pending draw; 33 reputation tiles including pending draws; technology supply including printed starting-tech exclusion; discovery supply including queued and claimed choices; population cubes across planets, ambassadors, graveyard and pending returns; influence discs including technology grants; per-type ship supply limits.
- Every twentieth command verifies a rejected fabricated decision leaves the input state exactly unchanged.
- Changed-file ESLint passes. Repository lint retains 88 errors and 12 warnings. Production build including Convex codegen and TypeScript passes (`coding_agents/logs/second-dawn-integration-review-build.out`).

These seeded AI matches establish deterministic completion and conservation for the tested seeds; they do not replace every unusual rule fixture, human playtesting, or independent visual usability review.

Rollback: Influence behavior is isolated to its case in `actions.ts`; other root-owned action handlers were not edited by this review. All other changes are independent tests, the owned battle module, and audit documentation.
