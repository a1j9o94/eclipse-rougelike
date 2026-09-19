# Stronger fast AI policy — validation, September 18, 2026

## User outcome and acceptance
Opponents can build and move a coordinated fleet, buy and install useful improvements, and use conversion without breaking the normal action economy. They prioritize profitable aggression and future points instead of accumulating immobile ships or uniformly valuing every technology. All choices use the same public seat view and command processor as people.

Acceptance cases cover combined arrivals, repeated activations, pinning and remaining activation budgets; funded purchases and component supply; two-slot and source-plus-weapon refits; early Hull value and populated-target Bombs value; weapon-preserving upgrades; continued reinforcement above seven ships; safe-home starbase avoidance; next-action upkeep thresholds; family diversity on a crowded board; saved population return choices after another return fills a track; view immutability and authoritative acceptance of generated plans.

## Implementation decisions
- Frozen old policy **and** old combat estimator provide a reproducible previous-controller reference.
- New AI-only per-family candidate limits prevent the old 500-entry cutoff from suppressing later actions. Human/default legal-candidate behavior stays as before.
- Paths simulate every moved ship in order. Long routes are split into actual speed-sized activations. Builds honor remaining activations and ship supply. Refit plans use the legal installation-order planner rather than merely checking final energy.
- Funding uses normal resource conversion and charges the policy for sacrificed resources and projected money reserve. No free materials or special AI discounts.
- Computers only receive combat value in combination with weapons. Improving a blueprint no longer means replacing its last gun with another computer.
- Next-action affordability reads the nonlinear upkeep track after spending the disc. Sector evaluation distinguishes income potential from its marginal upkeep burden.
- Fast policy is the safe, tested fallback for bounded search. These results do not measure the search controller.

## Failing-first tests and verification
`src/__tests__/second_dawn_ai_strategy.spec.ts`: 13 passing behavioral tests. Initial missing candidate generator, last-weapon refit, queued-full population track and crowded family omissions were observed failing before their implementation/fix; logs under `coding_agents/logs/ai_*_red.out`.

Final focused batch: **23 passed**, including 9 existing legal/controller tests and the existing eight-match random-action baseline. Scoped ESLint and eclipse TypeScript passed. Whole-slice production build and repository lint are run by the parent orchestrator.

## Held-out tournament
Tuning used seeds **131 and 257**. Policy then froze before evaluation on **901–906**. The latter six seeds rotate all six faction families through the focal first/last seats. For each count/seed, run one all-legacy reference and two games replacing only the focal controller with the new fast policy: **30 reference games + 60 improved games**, all through scoring.

| Players | New-policy wins | Mean focal VP change vs same seat reference | Mean leader-margin change |
| --- | ---: | ---: | ---: |
| 2 | 10 / 12 | +5.83 | +6.08 |
| 3 | 7 / 12 | +7.50 | +8.42 |
| 4 | 6 / 12 | +5.42 | +6.83 |
| 5 | 6 / 12 | +8.58 | +6.00 |
| 6 | 4 / 12 | +7.83 | +7.42 |

Raw reproducible results: [second_dawn_ai_strategy_holdout.json](second_dawn_ai_strategy_holdout.json). Runner: `tools/second-dawn-ai-strategy-benchmark.mjs`; configure `AI_SEEDS`, `AI_COUNTS` and `AI_BENCHMARK_OUTPUT`. These are same faction/seat/seed comparisons, not misleading comparisons of unlike factions' absolute scores.

Across **8,230 improved-policy decisions**, local elapsed time: p50 **0.043 ms**, p95 **10.77 ms**, p99 **16.72 ms**, maximum **23.26 ms**. Forced/free decisions are included. These are fast-policy measurements, not deep-search budgets or hosted latency.

An inherited old-controller population-return failure is handled only in the benchmark by trying its next highest-rated authoritative-legal choice. Every fallback is counted in the raw results; the production fast controller instead filters the stale impossible return. No gameplay rules were changed to make the benchmark finish.

## Limits, risks and rollback
This is six held-out seeds per supported count, not a large independent statistical study. Branching choices consume RNG differently, so identical starting seeds do not imply identical later dice. First and last focal seats are tested; not every seat permutation. No hosted concurrency, cost, peak-memory, subjective human difficulty, or deep-search superiority claim follows from these results.

Generated plans are selective, not exhaustive. Multi-owner battles are assessed conservatively through separate public estimates. Longer coordinated plans replan after each accepted action. Strategic search needs its own matched tests against this fast policy: passing can skip ahead to next-round income and make incomparable partial horizons look attractive, and researched parts need potential value before an Upgrade occurs.

Rollback is a controller selection change to the preserved old policy; neither saves nor rules schemas depend on heuristic internals.

Post-tournament correctness regression: a funded continuation can have zero influence discs because its action disc was already spent. Its reserve estimate now uses the current upkeep slot and clamps next-action indices to the actual 13-slot range; a failing-first test reproduces the former exception. This is a runtime correctness fix, not held-out strategic tuning.
