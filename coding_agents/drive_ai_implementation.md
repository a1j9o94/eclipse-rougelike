# Drive AI heuristic follow-through

Date: 2026-09-19

Branch: `feature/drive-ai-heuristics`

## Outcome

Hard and Expert search now use a deterministic public-information follow-through prior when shortlisting research, refit, and movement candidates. The focused slice discounts invasions that cannot retain a control disc or reliably clear population, recognizes Neutron Absorber, values Ancient preparation only while a deployed fleet and enough time/discs exist, ties refit value to deployed hulls and visible matchup traits, and prices the exact marginal technology-track VP late in the eight-round game.

Normal remains on the existing fast policy. The rules engine, authoritative RNG, private opponent reputation, search depths, node limits, sampling counts, and server deadlines are unchanged.

## Acceptance

- [x] A conquest begun with only the action disc remaining is worth materially less than the same conquest with a separate control reserve.
- [x] Neutron Bombs do not promise automatic population removal against a public Neutron Absorber.
- [x] A useful Ancient-oriented refit pays back on deployed hulls; an unused blueprint receives a penalty, especially late.
- [x] Late research uses the published marginal track score rather than a generic “late technology” bonus.
- [x] The implementation reads only `PlayerView`, is deterministic, adds no RNG/simulation calls, and stays inside existing compute budgets.
- [x] Relevant bounded tests, lint, and build pass.

## Sources and credits

The implementation follows the hypotheses and ruleset cautions in [AI heuristic research](faction_research/ai_heuristics.md), with provenance in the [collection overview](faction_research/README.md), [archive manifest](faction_research/source-archive-manifest.json), and [credits](faction_research/credits.md).

The designated source is [Régis Étienne’s Drive collection](https://drive.google.com/drive/folders/1pFDgHXE_gsLb2AT3hPptgiSuuM237KHR). Régis Étienne is credited as compiler/adaptor. The strategy material and preserved discussion are separately credited to **Chris K. (@chrisdk)**, **Japhet (@jaafit)**, and **@NaaRyyS**; this implementation does not collapse their distinct authorship into the compiler credit.

Relevant original references:

- [Surrounded by Ancients in Second Edition — An updated strategy guide](https://boardgamegeek.com/thread/2569782/surrounded-by-ancients-in-second-edition-an-update), Chris K., with the archived marginal-reputation discussion including Japhet.
- [An advanced guide to Eclipse for beginners](https://boardgamegeek.com/thread/2394376/an-advanced-guide-to-eclipse-for-beginners), @NaaRyyS.
- `ECLIPSE TIPS AND TRICKS.docx` in the Drive collection; individual authorship is unspecified in the preserved extract.

## Decisions

1. **Add a cheap prior, not deeper search.** `shared/eclipse/aiStrategy.ts` computes bounded analytic adjustments. It does not add Monte Carlo trials, candidate families, search nodes, caches, or deadlines.
2. **Integrate at Hard/Expert shortlist ranking.** `aiSearch.ts` applies the prior to both generated candidates and its combat-aware fast candidate. Normal still exits through the existing fast policy.
3. **Value completion, not aggression.** A Move action reserves one disc for the action and needs another for control. Populated conquest distinguishes automatic clearance from expected cannon bombardment, including the defender’s public Neutron Absorber.
4. **Require visible payback.** Refit deltas are evaluated against public blueprint stats, visible enemy traits, deployed hull count, and timing. Ancient preparation is conditional on visible hostile Ancients, a mobile fleet, early timing, and influence capacity.
5. **Use exact eight-round scoring.** Late research uses `researchTrackVp(before + 1) - researchTrackVp(before)`. No ten-/twelve-round variant, deterministic public reputation, or other house-rule mechanic was introduced.
6. **Keep concurrent work isolated.** This branch does not edit `ai.ts`, `aiEvaluation.ts`, `aiCandidates.ts`, or `aiSimulation.ts`, where the separate Rift Cannon slice is being developed.

## Tests and measurements

Fail-first evidence: `second_dawn_ai_drive_heuristics.spec.ts` initially failed to resolve the not-yet-created `aiStrategy` module. After implementation, its four initial paired scenarios and two focused Ancient/matchup characterizations passed.

| Check | Result | Measurement |
| --- | --- | --- |
| New Drive heuristic scenarios | Pass | 6/6 tests; 0.70 s Vitest process duration |
| Focused AI regression set | Pass | 52/52 tests across 5 files; 5.37 s duration |
| Search regression/performance check | Pass | 12/12 tests; 3.19 s test time, 4.56 s wall time; single run, `--maxWorkers=1` |
| Existing fixed-seed comparison | Pass | 8 matches, four seeds with seat swap; 8 wins, 0 ties, 0 losses versus the simple random legal-action baseline; VP margins 27, 20, 17, 19, 11, 14, 23, 17; 2.54 s test time |
| ESLint | Pass | `npm run lint` |
| Production build | Pass | `npm run build` including codegen, both TypeScript checks, and Vite |

The eight-match comparison exercises the unchanged Normal fast policy and is therefore a regression/health check, not an isolated measurement of the new Hard/Expert prior. Its sample is too small and its baseline too weak to support a broad superiority claim. The search timing is one local run, not p95 server latency.

Commands used:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npx vitest run --pool=threads --maxWorkers=1 --reporter=dot \
  src/__tests__/second_dawn_ai_drive_heuristics.spec.ts \
  src/__tests__/second_dawn_ai_strategy.spec.ts \
  src/__tests__/second_dawn_ai_search.spec.ts \
  src/__tests__/second_dawn_ai_simulation.spec.ts \
  src/__tests__/second_dawn_legal_ai.spec.ts

NODE_OPTIONS=--max-old-space-size=4096 npx vitest run --pool=threads --maxWorkers=1 --reporter=dot \
  src/__tests__/second_dawn_ai_benchmark.spec.ts

npm run lint
npm run build
```

## Limitations and remaining hypotheses

- The conquest prior estimates cannon bombardment from expected public die hits. It does not claim a guaranteed clear and leaves authoritative rolls and population choices to the engine.
- It evaluates visible matchup traits analytically rather than resimulating every candidate blueprint. This preserves the compute budget but cannot model every initiative, missile, damage-allocation, or multi-owner interaction.
- Ancient preparation is a shortlist prior, not a multi-action reservation contract. Deeper search still decides whether research/refit/build/move actually completes.
- No claim is made about Hard/Expert win-rate improvement. A future held-out study should use fixed-seed seat rotation across supported player counts/factions and report unclaimed victories, unusable preparation, stranded resources, VP margin, cutoff rate, and server latency.
- Marginal private reputation was deliberately left unchanged: current private information boundaries remain intact, and the source-backed rack-improvement hypothesis needs its own paired behavioral and holdout evaluation.

Rollback is an ordinary revert of the new strategy module, its tests, and the two `aiSearch.ts` ranking call sites. No save or data migration is involved.
