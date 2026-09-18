# Second Dawn UX P0 baseline

Date: September 18, 2026  
Code baseline inspected: `0ff926c` (`docs: center standalone UX plan on game feel and strategic mastery`)

## Evidence boundary

This is a code, fixture, and automated-test baseline. It is not a human usability study. No newcomer or experienced-player session was observed for this audit, so option discovery, consequence comprehension, felt tactility, delight, hesitation, backtracking, accidental commits, and strategic expression remain **human playtest pending**. Existing browser scripts explicitly describe their output as agent automation rather than human evidence; their elapsed times must not be reported as human completion times.

The observations below describe the inspected checkout. P1 implementation was being developed concurrently, so final review must recheck the resulting diff rather than treating this document as post-change evidence.

## Reproducible isolated review surface

Run `npm run dev -- --host 127.0.0.1 --port 5175`, then use the isolated engine fixture route. `SecondDawnReview.tsx` clones recorded `GameState` fixtures, projects them through `getPlayerView`, derives `legalCommands`, and submits to `processGameCommand`; it does not write a guest match.

| Review goal | Local URL / position | Safe functional path |
| --- | --- | --- |
| Research workspace and established empire | `http://127.0.0.1:5175/?position=midgame#second-dawn-preview` | Open **Research**, inspect owned and market technologies, choose a purchasable tile, inspect track/funding and confirm. Existing `tools/second-dawn-research-review.mjs` is a read-mostly layout check but does not purchase. |
| Funded research action | `http://127.0.0.1:5175/?position=workflow-research#second-dawn-preview` | Open **Research**, select the fixture's available purchase, inspect conversion inputs, and confirm once. Verify the isolated-success status and the first history entry. |
| Movement workflow | `http://127.0.0.1:5175/?position=workflow-move#second-dawn-preview` | Open **Move**, select ships, select a highlighted destination, and confirm. Recheck whether the planner remains available when the returned action has activations. |
| Pinning explanation | `http://127.0.0.1:5175/?position=pinned#second-dawn-preview` | Inspect the occupied sector and verify the explicit pinning explanation. This is covered by `tools/second-dawn-independent-walkthrough.mjs`. |
| Draft/inspection continuity | `workflow-move` or `midgame` on the same preview route | Create an uncommitted move/research draft, open available public inspection/navigation, return, and compare ship selection, target, research choice, action, and map camera. Refresh/reconnect persistence needs a real `matchId`; preview mode intentionally does not persist drafts to `localStorage`. |
| Mobile action paths | Same URLs at `390 × 844`, touch enabled | `tools/second-dawn-mobile-actions-review.mjs` exercises research and movement against isolated fixtures. It proves selector-level completion only, not discoverability or comfort. |

`#second-dawn-review` appears in one older walkthrough script, while the application and current review component link use `#second-dawn-preview`; use `#second-dawn-preview` for new evidence. Browser scripts that assume a server on port 5175 should be inspected before execution. The preview is local and engine-backed, but it does not cover Convex rejection/reconnect latency or multiplayer concurrency.

## Code-observed baseline

### Research

- The research workspace exposes market tiles, counts, minimum attainable cost, current science, technology statistics, descriptive effects, owned technologies, and a conversion-available label.
- Selecting a market tile stores `researchSelection` and a legal command candidate. Multi-track cases render explicit track choices. Funded purchases use `FundingPlanSelector`, preview the atomic `trade-and-act` command, and do not submit while the funding mix is edited.
- The actual commit control remains in the inspector's generic action panel and is normally labeled `Confirm action`; funded research uses `Convert & research`. This is the plan's baseline split between tile workspace and confirmation surface.
- Inspecting an owned technology sets the selection and clears the purchase command, preventing owned inspection from immediately submitting a purchase. Existing tests cover readable effects before submission and funded command atomicity.
- A successful research receipt clears `commandDraft`, but `researchSelection` is not among `keysForCommand('research')`. The workspace therefore has enough state to keep the acquired technology selected, subject to the authoritative view update and market change. There is no focused integration assertion yet for the acquired tile's visible payoff, optional next step, or continued-research behavior.

### Movement

- The planner lets the player choose multiple ships from one source, derives legal destinations from the authoritative public view, displays a route and activation count, enforces pinning/capacity in planning, and submits one `move` command. Engine-focused tests cover multi-hop activation cost, pinning, mixed ship speeds, and exact-once component submission.
- Every selected ship is routed to the same selected destination. The draft schema is `{source, ids}` plus one `moveTarget`; it cannot represent split destinations.
- `SecondDawnBoard` calls `onSubmit(command)` and immediately calls `setMoveOpen(false)` and clears target highlights. This happens without waiting for `lastAcceptedCommand`, so both an accepted move with activations remaining and a rejected/stale move close the planner. This is a direct P1/P2 continuity and recovery risk.
- `MovementPlanner` is keyed by `${view.revision}-${moveSource}`. Ship IDs live in `ActionDraftProvider`, so a remount can restore them, but an authoritative revision makes the draft stale until explicit review. The final behavior after an accepted move needs to reconcile moved/remaining ships deliberately rather than blindly preserving invalid IDs or clearing all intent.

### Shared drafts and inspection

- `ActionDraftProvider` partitions persisted drafts by match and viewer, validates a strict public-data whitelist, retains meaningful drafts across unrelated revisions, requires explicit review of stale drafts, and clears only keys whose matching submitted command receives a fresh acceptance receipt.
- The stored keys include selected sector, screen, camera, action, research selection, movement source/target/ships, build data, and other workflow state. Tests cover refresh restoration, seat/match separation, malformed/secret-bearing storage rejection, stale review, and duplicate receipt handling.
- Preview mode omits `matchId`; it exercises in-page continuity but deliberately does not write drafts to browser storage. Refresh/reconnect claims must use an actual match harness or component test with `matchId`.
- Inspection and action state still share `SecondDawnBoard` navigation. Several navigation paths call `setDraft(null)`, and opponent/blueprint inspection changes screens/player selection rather than using an independent inspection overlay. Existing draft unit tests prove storage mechanics, not the full requirement that public inspection returns to the identical action, selection, target, and camera.

## Existing test seams

| Contract | Existing useful coverage | Missing acceptance coverage |
| --- | --- | --- |
| Research readability | `second_dawn_research_readability.spec.tsx`, `second_dawn_research_cost.spec.tsx`, `second_dawn_researched_technologies.spec.tsx` | Purchase from local tile detail; specific commit label/cost; acquired-tile payoff; inspect another tile and return to unfinished choice; remote market depletion invalidation. |
| Funding correctness | `second_dawn_funding_ui.spec.tsx`, `second_dawn_funding.spec.ts`, `second_dawn_funding_convex.spec.ts` | Whole research-workspace behavior after rejection/stale revision and continued legal activation after acceptance. |
| Movement rules | `second_dawn_movement_planner.spec.tsx`, `second_dawn_command_preview.spec.ts`, engine action tests | Planner remains open only after accepted receipt; rejected submission remains editable; next eligible ship offered without auto-moving; later P2 split destinations and ordered whole-draft validation. |
| Draft persistence | `second_dawn_action_drafts.spec.tsx`, mobile resume and connection recovery tests | Full board-level move/research draft survives opponent/neutral inspection and restores exact screen, target, and camera; real match refresh/reconnect for these workflows. |
| Fixture/browser review | `SecondDawnReview.tsx`, `reviewFixtures.json`, research/mobile/independent Playwright scripts | A dedicated P0/P1 script that records pre/post action state and acceptance receipt, rejection behavior, continued movement, and draft identity. Human observation remains separate. |

## Serious implementation risks to address

1. **Do not infer acceptance from a click.** Movement currently closes on invocation. Continuation and cleanup must be driven by a fresh matching receipt; a rejection or stale response must preserve an editable draft and display the reason.
2. **Reconcile movement after acceptance.** Preserving the old ship IDs unchanged can leave already-moved ships selected; clearing everything loses departure context. Recompute legal remaining ships and destinations from the returned view, retain only valid intent, and never auto-move the suggested next ship.
3. **Keep research preview and authoritative legality aligned.** Displayed track cost and funding mix must be derived from the exact command that remains legal at commit time. Market depletion, action changes, and revision changes need visible invalidation rather than a silent switch to another candidate.
4. **Separate owned inspection from purchase intent.** An owned tile must never inherit a market command. Returning from inspection should restore an unfinished market selection, track, and funding choice where still legal.
5. **Test the complete board contract, not just helpers.** Existing helper/component tests are strong on engine rules but do not catch board callbacks that close workflows prematurely or navigation that clears drafts.
6. **Preserve public/private boundaries in inspection.** Draft persistence must not broaden stored or displayed data. Continue using `PlayerView`, public blueprints, projected history, and the strict draft whitelist.
7. **Keep evidence labels honest.** Fixture automation can establish functional behavior and visual state. It cannot establish newcomer discovery, comprehension, tactile agency, delight, or expert strategic expression.

## Human baseline still required

Run comparable tasks with participants unfamiliar with Eclipse and experienced players, recording familiarity, device, fixture/position, exact prompt, unaided success, clicks/taps, panel changes/reopens, hesitation/backtracking, accidental commits, explanation of benefit/cost/scope, perceived payoff, willingness to continue, and the strategic alternative considered. Required tasks for this slice are funded and unfunded research, continued movement after a first accepted move, a rejected/stale movement attempt, and draft-preserving inspection. No improvement percentage or claim that the experience is fun should be made until that evidence exists.

## Targeted baseline check

Command run while P1 files were changing concurrently:

`npm exec vitest run -- --pool=threads --maxWorkers=1 src/__tests__/second_dawn_research_readability.spec.tsx src/__tests__/second_dawn_funding_ui.spec.tsx src/__tests__/second_dawn_movement_planner.spec.tsx src/__tests__/second_dawn_action_drafts.spec.tsx`

Result: 22 passed, 3 failed. All 9 draft tests and all 12 movement-planner tests passed. Two funding UI assertions still expected a button named `Convert & research`, while the concurrent implementation rendered `Convert & Research · 4 science`. The research-readability assertion expected the selected effect in the inspector, while the concurrent implementation rendered a generic `Research in place` inspector and moved detail into a local research region. These failures show that the P1 UI contract and its tests were temporarily out of sync; they are not evidence of human usability and require reconciliation in final review.

## P1 independent diff review

Reviewed the working diff without browser execution because localhost browser access was unavailable and no alternative browser was authorized.

- Movement submission now waits for a fresh matching move receipt and for the authoritative board revision to catch up. The focused tests demonstrate that an unaccepted move remains editable, an accepted continuation keeps the planner open, moved ship selection is cleared, and an exhausted accepted action closes only after the updated board arrives.
- `Done moving` still routes through `activate('end-action')`, which immediately closes movement before an acceptance receipt. A rejected or stale end-action can therefore remove the active workspace. This path needs receipt/rejection coverage or deliberate restoration.
- Research keeps an unfinished purchase while another technology is inspected and only clears the serialized submitted command after ownership and a matching receipt type are visible. This avoids clearing a newer draft created while the earlier command was in flight.
- Inspecting an alternative market technology while a draft exists exposes only `Return to … draft`. Replacing the draft requires returning and cancelling first. The rules choice is preserved, but a direct, explicit “research this instead” path would make comparison and revision materially clearer.
- The affordability algorithm counts future ordinary action discs against exact upkeep boundaries and correctly incorporates projected money, income, and influence. In the Hydran test fixture, trading one science spends 3 money: money becomes −1, income is 3, upkeep 2 leaves 0 after one further action, and upkeep 3 creates a shortfall after the next. The correct result is therefore one affordable action; a test expecting two is incorrect.
- Bounded review run: research workspace, funding, research readability, and movement continuity suites passed. Three economy assertions were red during concurrent fixes: honest current labeling for a null preview, suppression of next-action language after passing/outside the action phase, and the incorrect Hydran trade expectation described above.
