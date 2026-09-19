# Optional movement battle estimates

## Outcome and acceptance
When the game setup enables combat estimates, selecting a fleet and a legal destination shows a rough fleet-win percentage beside that route. Players can see the assumptions and sampling uncertainty before choosing to move. Games without the option do not calculate or display estimates.

Acceptance: use only the supplied PlayerView and current public blueprints; preserve authoritative RNG and input state; show no false certainty for empty sectors, mixed owners, or unsupported active fights; remain responsive, cancel superseded work; preserve movement legality and commands. Root owns the persisted game/room setting and Board wiring (`MovementPlanner.showCombatOdds`, optional and false by default).

## Implementation and decisions
`shared/eclipse/movementBattleEstimate.ts` adapts the existing public-only AI duel estimator. It projects selected arrivals into the destination, includes friendly ships already there, retains current damage, uses standard neutral blueprints and respects Draco/Ancient coexistence. Sector-owner defence and neutral-defender priority determine which side receives defender initiative advantage. Mixed opponent owners, active battles and ambiguous arrival ordering for reinforcements into an unowned contested sector receive an explanation instead of a numeric guess.

Simulation uses fixed independent seeds, four-trial batches yielding between batches, at most 96 samples, a 60ms accumulated simulation-compute budget, a 24-cannon-round horizon, and fleet/dice caps. Work is aborted on selection or setting changes. Too few samples or more than 5% unfinished simulations suppress the percentage. These are best-effort bounded browser workloads, not a claim about every physical device's timing.

`MovementBattlePreview` displays an approximate percentage rounded to 5%, a simple meter and fleet counts. Its disclosure contains the Wilson 95% sampling interval and explains that the model ignores voluntary retreats, future reinforcements/upgrades and chosen hit/tied-initiative ordering. Victory means the friendly fleet survives and the opposing fleet is destroyed, not sector control or bombardment. Sampling uncertainty does not quantify all strategic/model uncertainty; the result is explicitly not a guarantee.

## Verification
- New estimator import tests and enabled-UI expectation failed before implementation.
- 39 tests in four bounded files pass: estimator correctness/privacy/cancellation/caps, opt-in UI, existing movement planning, and existing combat simulation fidelity.
- Shared Eclipse TypeScript and changed-file lint pass. Parent retains integrated lint/build, setup/backend tests and release.
- `tools/second-dawn-movement-odds-review.mjs` uses the actual MovementPlanner in an isolated local host, Chromium and WebKit at 1440×900 and 390×844. Percentage/disclosure rendering, setting-off removal, no page errors and no horizontal overflow pass.
- Twenty-ship stress samples completed 96 trials in 95–116ms elapsed, including deliberate timer yields. The event-loop heartbeat ran 16–19 times; largest observed heartbeat gap was 6–9ms. This is local browser evidence, not a physical low-end-device benchmark.
- Reviewed images and measured results: `coding_agents/second_dawn_movement_odds_review/`. The host's checkbox is a test harness; production setup/room controls are owned and verified by the root task.

## Risks and follow-up
The estimator shares the already reviewed AI simulation approximations. It must not become a source of command legality, reveal hidden information, or modify combat outcomes. No statistical calibration against human combat choices is claimed. Newcomer/expert playtests and slower physical-device checks remain follow-ups. The component/estimator can be removed independently; the additive setting remains safe when absent.
