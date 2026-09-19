# Strategic AI combat estimate

Player outcome: opponents can judge a prospective duel and ongoing cannon fight without inventing an extra missile volley, assuming rival fleets are allies, or treating an unfinished simulation as a win.

Acceptance: independent observable-input RNG; no state mutation; distinct attacker, defender and unresolved results; known no-enemy cases; repeated missiles prevented during current cannon engagements; red-cannon-only Antimatter Splitter; forced-retreat survivor estimates use target-sector legal destinations; strict bounded trial/round inputs; seeded outcomes calibrated against authoritative rules.

Implementation and evidence:

- `shared/eclipse/aiSimulation.ts` preserves existing positional callers and `winProbability`, and adds explicit outcome/model fields plus optional stage and 0–32 cannon-round limits. Trials remain 1–128.
- Eight new behavioral tests failed before implementation; destination-retreat test separately failed before its fix.
- Twelve focused tests now pass, including 24 exact authoritative splitter volley comparisons and 128 dice checked against shared `dieHits`.
- Existing `battleEngine.ts` defines the rules used: group initiative, forced unarmed retreat/destroy when no route, and split red cannon damage only among hittable targets. No new rules introduced.
- The estimator intentionally returns `model: multiple-owners` with unresolved probability 1 for multiple owners on either side. The strategy caller must choose separate duel pairings. Draco/Ancients and same-owner inputs are explicitly non-opponents.
- No voluntary retreats or chosen tied-initiative order are simulated. Ongoing engagements restart the cannon round with current damage, not an exact partial firing-group continuation. These remain approximation limits, not gameplay rule changes.

Rollback: revert estimator and its new test additions together; compatibility fields and defaults remain available to existing callers. Parent owns branch integration and whole-application verification.
