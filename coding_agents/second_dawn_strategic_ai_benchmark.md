# Strategic AI benchmark

User outcome: stronger AI has measured playing-strength and compute evidence, with complete games that do not hide failures behind automatic passing.

Harness: `tools/second-dawn-strategic-ai-benchmark.mjs`. It uses public seat views, frozen legacy or current fast opponents, the authoritative command processor and final scoring. It records work caps, completed search depth, external wall time, action mix, bankruptcy decisions, inherited illegal legacy fallback counts, score/tiebreak results, sampled process RSS and source hashes. A failed game is recorded as failed. Results write after every round/match so interruptions retain evidence.

Acceptance: complete search-controlled games at supported player counts; paired-seat comparison with the fast fallback; actual four/five-action completed depth; no hidden-state input; legal accepted commands and nonnegative integer resources; honest latency and limitation reporting. Hosted latency, concurrency, worker memory and billing require separate runtime evidence.

## Development findings

- Early Normal with only 12 nodes completed eight 2–5-seat games but won one. These were depth-one runs, not evidence for shipping a stronger Normal search mode. The interrupted report preserves all outcomes.
- The initial six-seat harness setup accidentally mixed a Terran faction and its alien counterpart sharing a physical color; setup correctly rejected it. Harness now selects six distinct alien colors and validates all supported counts.
- The first full-budget Normal comparison at seed 997 exposed an actual search exception: a funded continuation with zero remaining influence evaluated hypothetical upkeep at 14 empty slots. Both paired Normal games stopped and were recorded as failures. The strategy agent added a targeted regression and fixed continuation upkeep. Raw failure reports and stack trace are retained.
- Parent decided Normal uses the improved fast controller; Hard/Expert retain bounded search. Stronger search is not inferred merely from its greater depth.

## Method and limits

The benchmark supplies a constant clock to make node-limited choices deterministic, while measuring elapsed time externally. These times do not test a hosted deadline or include animation pacing/network latency. Work caps are explicit in each JSON. Source hashes identify the loaded policy; source edits observed during a run are flagged. The Vite SSR/harness RSS is not deployed planner heap usage.

Seed 1019 became development evidence when its results motivated a bounded fast-policy prior and stable observable-state opponent seed. Seed 1069 is reserved for the subsequent paired search-versus-fast check; seed 1009 is used for supported-count completion checks. Once a result drives tuning, that seed becomes development evidence rather than independent held-out evidence. One paired seed cannot certify general strength, rank difficulty levels reliably, or separate all faction/seat effects. Six-player win rate should be assessed against its player-count baseline, not an arbitrary 50% threshold.



## Supported player counts: complete search-controlled games

Seed 1009, one Hydran Hard seat against frozen prior AI, 48-node cap, constant clock. All five games finished with valid scoring and no illegal strategic commands or legacy fallbacks. Source hashes were unchanged during the run. Every scenario reached depth four; median work was 26 nodes, so the 48-node cap did not reduce the typical search below its planned depth.

| Seats | Commands | Search score | Margin vs leader | Result | Deepest actions | Search p95 / max |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| 2 | 346 | 26 | +11 | Win | 4 | 0.573s / 1.089s |
| 3 | 426 | 26 | +11 | Win | 4 | 0.916s / 0.995s |
| 4 | 532 | 21 | +2 | Win | 4 | 1.551s / 1.708s |
| 5 | 696 | 11 | -17 | Loss | 4 | 1.722s / 2.408s |
| 6 | 788 | 25 | -1 | Loss | 4 | 2.916s / 2.976s |

Raw evidence: `second_dawn_strategic_ai_benchmark_coverage.json`. Across 204 searched decisions, p50 was 0.935s, p95 2.243s, and max 2.976s locally. These are completion and sampled performance results across player counts, not a broad win-rate certification.

## Held-out paired search versus improved fast policy

Seed 1069; identical initial setup, replacing the first or second seat with search. Full configured node caps: Hard 180 / Expert 600. All four games finished, source hashes stayed unchanged, and final scoring/tiebreaks were valid. Fast-versus-fast control: Hydran 19, Mechanema 12. This is one paired seed across two factions, so it establishes an observed result, not general difficulty ordering.

| Search level | Search faction | Search score | Opponent score | Result | Deepest actions | Search p95 / max |
| --- | --- | ---: | ---: | --- | ---: | --- |
| hard | hydran | 13 | 17 | Loss | 4 | 0.561s / 0.567s |
| hard | mechanema | 15 | 9 | Win | 4 | 0.514s / 0.522s |
| expert | hydran | 17 | 10 | Win | 5 | 2.550s / 2.607s |
| expert | mechanema | 15 | 11 | Win | 5 | 2.538s / 2.620s |

- Hard: 57 searched decisions; p50 0.382s, p95 0.544s, max 0.567s. Median completed depth 4; median work 26 nodes.
- Expert: 62 searched decisions; p50 1.626s, p95 2.538s, max 2.620s. Median completed depth 5; median work 88 nodes.

Raw evidence: `second_dawn_strategic_ai_benchmark_heldout.json` and `second_dawn_strategic_ai_benchmark_heldout_control.json`. Hard won one of two; Expert won both. Normal's broad fast-policy benchmark is maintained separately by the strategy agent. The result supports continued testing of deeper search; Hard's lost Hydran game confirms it is not universally better than the fast policy. Do not generalize the two Expert wins into a claimed win rate.

## Validation and reproduction

`npx eslint tools/second-dawn-strategic-ai-benchmark.mjs` passes. Setup generation was checked for all supported player counts after the physical-color fix. Completed games enforce authoritative command acceptance, integer nonnegative resources and a final score entry for every seat. Legacy's inherited illegal candidate fallback is explicitly counted; current coverage used none. Existing search unit tests own deterministic hidden-information equivalence/deadline semantics; this harness tests actual game completion and external runtime.

Reproduce the final comparison:

```sh
AI_COUNTS=2 AI_SEEDS=1069 AI_DIFFICULTIES=hard,expert AI_HARD_NODES=180 AI_EXPERT_NODES=600 AI_OPPONENT=fast AI_BENCHMARK_OUTPUT=coding_agents/second_dawn_strategic_ai_benchmark_heldout.json node tools/second-dawn-strategic-ai-benchmark.mjs
```

Reproduce player-count coverage:

```sh
AI_COUNTS=2,3,4,5,6 AI_SEEDS=1009 AI_DIFFICULTIES=hard AI_HARD_NODES=48 AI_OPPONENT=legacy AI_SEAT_ONLY=first AI_BENCHMARK_OUTPUT=coding_agents/second_dawn_strategic_ai_benchmark_coverage.json node tools/second-dawn-strategic-ai-benchmark.mjs
```

Follow-ups: more held-out factions/seeds and mirrored starts, regression targets for search hurting otherwise winning fast-policy lines, hosted-worker memory/cost/concurrency and real deadline measurements, then human playtests of perceived aggressiveness. None of these local results establishes human enjoyment or subjective difficulty.
