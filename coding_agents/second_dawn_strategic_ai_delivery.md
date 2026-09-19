# Strategic AI delivery — September 18, 2026

## Player outcome and acceptance
Opponents invest in useful fleets and technologies, coordinate invasions, and avoid economically poor expansion. Normal stays fast; Hard and Expert can spend bounded server time comparing multi-action plans. Every seat still obeys the same authoritative rules and hidden-information boundaries.

Acceptance: tactical regressions for coordinated attacks, useful Hull/Bombs research, funded purchases, multi-part refits and upkeep; full matches at 2–6 seats with valid scoring; held-out comparison with frozen previous AI; deterministic public-only search and unchanged gameplay RNG; deadline fallback; revision/lease/ownership-safe server execution and takeover recovery; readable difficulty settings; bounded tests, changed-file lint, TypeScript and build.

## Decisions
- Preserve the original controller and estimator in `aiLegacy.ts`/`aiLegacySimulation.ts` for comparisons. Normal uses the improved fast policy. Early shallow search was less consistent than this policy, so Normal has zero tree nodes rather than an unverified search layer.
- Fast policy generates whole fleets, full Build activations, affordable conversion plans and paired refits. Military technologies receive contextual value, researching a part is followed by useful installations, and upgrades retain effective weapons. Next-action upkeep and nonlinear marginal income govern expansion and passing.
- `aiSearch.ts` performs selective receding-horizon search at ordinary action boundaries. Hard targets four complete own actions, Expert five, including intervening opponent turns and actual engine resolution of activations/choices. Only the next command is committed. Pending choices use the fast policy; future decisions are replanned from authoritative views.
- Hard uses two retained branches and two hypothetical samples; Expert four branches and three samples. Initial candidates preserve action-family diversity. Later layers are narrower to reach useful depth. Maximum nodes/time bound work; a partial deeper layer cannot replace a fully compared shallower horizon. A small bounded fast-policy prior protects against marginal improvements in a noisy short projection.
- Hypothetical worlds are constructed solely from PlayerView with independently seeded inventories. Known installed ancient parts cannot be redrawn. Public first passer and optional warp configuration are now included in views. Opponent policies receive their own filtered hypothetical views; policy seeds depend on the observable state rather than search traversal order.
- Evaluate projected final scoring, income through the same final-round horizon, accessible uncolonized population, technology potential, fleet condition, contested conquest and defensive exposure. Passing cannot appear to manufacture income merely by advancing the sampled calendar. Actual finished games use VP and the resource tiebreak.
- Search caches are limited to 128 entries / one million key characters, alongside beam/node/time bounds. No browser search worker or device-intensive loop is introduced. Existing AI playback pacing remains independent from computation.
- Shared difficulty config: Normal fast (500ms allowance), Hard 3s / 180-node / 4-action ceilings, Expert 30s / 600-node / 5-action ceilings. These are resource ceilings, not guaranteed decision quality or completed depth. Normal and timeout takeover never spend a fresh search budget per microcommand.
- Leased server actions receive filtered work; short mutations claim and validate commits. Persist match difficulty/version and internal timing/depth diagnostics. Failure remains visible and retries cannot double-commit. Optional schema fields preserve old saves.

## Tests first and independent review
Search tests first failed on absent modules. Additional tests first demonstrated incorrect terminal tiebreak handling, duplicated visible ancient parts, and missing future-colony/contested-conquest value; implementations corrected those cases. Fixed-node tests reach Hard depth four and Expert depth five and verify legal output, unchanged state/RNG, hidden-world invariance, cutoff fallback and honest depth reporting.

Separate implementation agents owned fast strategy, combat fidelity, and server/UI. Independent review found partial-depth cutoff bias, inflated terminal depth, an exhausted-influence edge, and worker takeover/command-ID concurrency cases. Those findings are tracked in focused regressions rather than treated as cosmetic follow-ups.

See [fast-policy results](second_dawn_ai_strategy_validation.md), [combat calibration](second_dawn_ai_combat_estimator.md), and [worker/UI validation](second_dawn_ai_runtime.md). Deep search strength is measured separately from the verified Normal improvements; additional computation is not presumed to imply a higher win rate.

## Evidence and limits
Initial held-out Normal results: 60 improved games and 30 all-legacy reference games, every game finished. Against the frozen old policy, wins at 2/3/4/5/6 seats were 10/12, 7/12, 6/12, 6/12, 4/12. Same-seat mean score improvement was +7.03 VP; measured local fast-policy p95 was 10.77ms, maximum 23.26ms. This is a finite benchmark, not a human-strength rating.

Earlier search development runs and failures remain recorded with source hashes. The normal12-node experiments are historical and do not describe shipping Normal. Runtime and strength metrics from local Vite SSR are not represented as hosted latency or standalone planner memory. Final search, hosted smoke, test/build, deployment evidence will be appended after verification.

Remaining model approximations: unknown spent discoveries and boxed/discarded sector ordering are sampled from public inventory, not reconstructed; beam search is selective and uses few chance samples; battle estimates omit voluntary retreat and some initiative timing, although rollouts use the authoritative engine. Human playtesting is still necessary to judge whether the aggression feels good and varied.

## Rollback and deployment
Deploy the compatible Convex schema/functions to `ideal-nightingale-55` before the frontend. Merge/push main for the existing Vercel Git deployment, never directly deploy a feature branch. Preserve scheduled worker endpoints during rollback or explicitly reschedule pending work; do not strand existing leases. No game rules or resource bonuses change.

## Final local gates
- All 719 tests across 141 Second Dawn files passed with one worker (116.03s). First combined run found two obsolete synchronous-worker/candidate assumptions; those regressions were corrected and the full suite rerun.
- Production build, Eclipse/Convex TypeScript, and all changed code lint pass. Full-repository lint remains the inherited 88 errors / 12 warnings.
- Final search benchmark: ten source-stable games, including all 2–6 player counts, paired Hard/Expert against new Normal and a same-seed Normal control. Hard achieved four actions; Expert five. Expert won both held-out paired games; Hard split them. The pair is too small to claim a general Expert win rate.
- Real integrated New Game difficulty controls reviewed at 1440×900 and 390×844, selected state correct, no overflow or page errors. Screenshots in second_dawn_ai_difficulty_review/integrated-*.png.
- Independent worker review reproduced and fixed off-turn takeover invalidation, ineffective retry, server command-key collision, and expired failed-clock reset. Six dedicated concurrency tests pass, plus guards for stale leases/tokens and duplicate commits.
- Compatible schema/functions successfully deployed to development ideal-nightingale-55; no snapshot migration. Deployment CLI removed the old convex.json automatically; the unrelated tracked file was restored. Hosted verification and Git deployment evidence follow under coding_agents/logs/strategic_ai_*.

## Hosted release verification
- Latest backend deployed successfully to development `ideal-nightingale-55` (including retained last-plan telemetry, which survives zero-node follow-up commands). One additional telemetry regression and the 14-test worker/adversarial batch passed after the 719-test suite.
- Real browser creation, reload and AI command acceptance passed for Normal and Hard at two seats and Expert at six seats. No page or worker errors. Hard completed depth four / 26 nodes in 441.8ms; Expert completed depth five / 88 nodes in 14,437.1ms. These are individual hosted opening decisions, not latency percentiles. Normal completed its fast command in 4.6ms.
- Thinking and accepted-action screenshots inspected: difficulty, active faction, comparing-plans state and subsequent action are visible; no new panel clipping or overlap. Existing map zoom remains user-controlled. Credential-free results and an Expert thinking image are in `second_dawn_ai_difficulty_review/hosted-*`.
- Final production build and lint of all 41 changed code files passed after the telemetry change. Vite retains existing large-chunk warnings; full-repository lint debt remains as recorded above.
