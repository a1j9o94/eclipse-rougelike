# Stronger strategic AI — assessment, September 18, 2026

## Outcome
Opponents build credible fleets, prepare and execute profitable attacks, and turn their economy into a competitive final score, with bounded server computation and no hidden-information advantage.

Status: research and proposal only. No gameplay, AI weights, backend deployment, or difficulty controls changed. Independent read-only review delegated to `ai_search_assessment`.

## Findings from the current implementation
- `shared/eclipse/ai.ts:301`: ranks commands with heuristics and combat estimates; no action-tree lookahead. Research mostly gets the same score (`:109`), so technology effects and follow-through are weakly represented.
- `ai.ts:135`: ordinary ship build value declines to zero at seven owned ships before small faction modifiers, regardless of the opponents' threats or available targets.
- `shared/eclipse/legal.ts:72`: first 500 generated candidates win the capacity race. Generation order can suppress later action families. Sample opening has 108 upgrade variants out of 123 candidates.
- Build candidates contain one component; moves contain one ship/activation; upgrades generally replace one slot. These can be executed sequentially but cannot represent all coordinated plans or atomic multi-part refits.
- Movement's cheap heuristic counts the source fleet, while its combat simulation counts only the arriving ship plus ships already at the destination. Coordinated attacks can look unprofitable on their first step.
- The AI does not generate funded action wrappers, and trade scoring is narrow. A valuable purchase may not be considered even when conversion makes it affordable.
- `convex/eclipseMatches.ts:249` and `convex/eclipseRooms.ts:352`: live normal AI and timeout takeover run inside mutations. Existing 1.2-second pacing is presentation delay, not thought time.
- Existing benchmark is eight fixed paired matches against a weak random-action controller, not evidence of strong competitive play.

Local warm Vite SSR profile (20 calls per fixture after three warmups): opening/midgame/late had 123/152/163 candidates, median 1.03/1.30/1.01 ms and p95 2.07/1.64/1.26 ms. This measures today's heuristic on three six-seat fixtures, not future search throughput, cold starts, or hosted latency. Full local report: ignored `coding_agents/logs/ai_strategy_profile.json`.

## Strategic policy
- Prioritize improvements that unlock reachable, profitable battles. Improved Hull should often receive a strong early preference when available, affordable, and installable on relevant fleets. Research plus its Upgrade action must be evaluated together; avoid an unconditional round-one script.
- Value Neutron Bombs when conquest of populated enemy sectors is plausible. They destroy population during bombardment, not enemy fleets. Orion already starts with them; evaluate counters and faction exceptions from the catalog.
- Size fleets for threats, attainable objectives and defense requirements; compare ship classes by effective combat value, build cost, movement, and blueprint quality rather than a global fleet-count cutoff.
- Evaluate sector control as VP plus useful population/income, positioning and discoveries, minus influence/upkeep and defense cost. Money-only sectors are not automatically worthless: marginal income can pay for more actions. Distinguish profitable expansion from consuming a disc for money the empire does not need.
- Optimize estimated chance of winning, with projected final score and score margin against credible leaders as supporting values. Early cashflow, science, production and military position are future scoring capacity; round-eight surplus production has little such value. Include reputation capacity, technology tracks, structures, faction scoring, diplomacy/traitor consequences, and loss of defended territory.
- Aggression should exploit favorable opportunities and deny leaders, not default to attacking the human or fighting losing battles. Risk tolerance may rise when behind near the finish.

## Search proposal
1. **Better candidate plans first.** Generate a diverse shortlist of complete legal action plans: funded research followed by a useful refit, atomic multi-slot refits, full Build activations, coordinated fleet movement, conquest/control/colonization, and deliberate passing. Keep forced/free decisions separate. Reuse actual rules and validate the committed command normally.
2. **Bounded beam search.** Keep a small diverse set of promising plans at each depth, instead of exhaustively expanding every raw command. Starting experiment: 12 retained plans, 12 successors, up to 4–5 own strategic action layers. About 720 expansions before opponent branches, random samples, and rollout costs; this is a sizing example, not a runtime promise.
3. **Model intervening opponents.** Four to five raw plies in a six-seat game can end before the AI's next turn. Our depth means its own strategic actions, with opponents' plausible replies between them, including defensive builds, counterattacks, and shared technology competition. Reactions, action activations and round transitions must be represented correctly. Replan after opponents act; future actions are plans, not reservations.
4. **Evaluate beyond the horizon.** Use end-of-round solvency and a projected final-score evaluator; selected candidates can receive cheap longer policy rollouts. Rewarding only current VP will systematically undervalue early development. Compare a rollout/MCTS variant only after candidate quality, model fidelity and throughput are measured.
5. **Fair uncertainty.** Search input is PlayerView. Hypothetical worlds may sample unrevealed tiles/reputation from legitimate public information with independent simulation RNG; never clone the actual hidden deck, opponent reputation, or authoritative RNG. Opponent rollout policies receive their own information views. Do not allow a plan to depend on hidden facts learned only in its sampled world.

Independent review also found that the battle estimator starts fresh missiles even when evaluating an ongoing cannon battle, combines multiple enemy owners into one opposing fleet, omits Antimatter Splitter, and treats one minus attacker victory as defender victory even for unresolved simulations. The estimator is deliberately approximate (no retreats/politics, truncated engagements). Validate it against authoritative seeded battle outcomes and meaningful combat branches before making it the basis for expensive strategic search. More depth over an inaccurate combat model can make decisions worse.

## Runtime and persistence
Proposed compute targets per strategic turn/action, shared across its activation/decision commands:

| Level | Budget target | Approach |
| --- | --- | --- |
| Normal | 100–500 ms | Improved strategy, small candidate set, short lookahead |
| Hard | 1–3 seconds | Selective 4–5 action horizon where useful |
| Expert | Usually under 10 seconds; 30-second cap | Broader alternatives and more uncertainty samples |

These are design targets requiring measurement, not guaranteed depths or response times. Forced choices finish immediately. Five Expert opponents using the full budget would mean up to 150 seconds of thinking across their turns, before presentation/network overhead; the default should stay fast and Expert should be opt-in.

- Run expensive search in a scheduled server action. A short query supplies a seat-filtered view and revision; a short mutation rechecks actor, revision, timer/ownership and legality before committing. Apply the same controller path to timeout takeover.
- Persist a job lease/status, AI version, simulation seed, total remaining budget, and resumable plan where useful. Duplicate retries and stale results cannot double-commit; failed jobs stay visible. A time cutoff returns the best completed legal result, never a silent pass on error.
- One worker per active decision; node/memory/deadline limits; avoid a database operation per search node. Cache movement, blueprint stats, equivalent loadouts and battle estimates. Prune dominated choices but preserve action-family diversity. Stop when extra search is unlikely to change the choice.
- Keep deterministic fixed-node budgets for tests and reproducibility; production may additionally stop by elapsed time and record consumed work. Do not charge another full Expert budget for every cosmetic/pending command.
- Keep existing readable AI playback separate from thought time. Show a modest thinking state before the selected action; do not pretend the AI has committed an action while still evaluating it.
- Live compute stays on the server, so it does not heat the player's device. Server cost and simultaneous-game throughput must be measured. Any future local/offline mode needs a Web Worker and its own budget.

## Acceptance criteria and tests to fail first
- Coordinated invasion: individually losing arrivals combine into a profitable legal fleet attack; reject the same attack with insufficient movement/activations or unacceptable counterattack exposure.
- Early research: choose and install Improved Hull when it materially changes a useful battle; do not buy it blindly when unaffordable, unavailable, redundant, or lacking follow-through.
- Conquest: prefer Neutron Bombs when population clearing unlocks value; do not confuse them with anti-ship damage or duplicate a faction's starting technology.
- Economy: reject low-value extra control with harmful upkeep; retain an otherwise money-only sector that pays for useful actions. Include non-linear income and influence tracks.
- Funded purchase, multi-part refit and full Build plans obey actual component supplies, energy, capacity, trade rates and command legality.
- Publicly identical views with different hidden decks/reputation produce identical decisions under the same test seed and node budget; state/RNG never mutated by search.
- Best legal result survives deadline; interrupted/stale/duplicate scheduled jobs remain safe; AI takeover respects room timer and solo wait policies.
- Paired seeds and faction/seat rotation against the frozen current AI and improved heuristic baseline; report win rate, score margin and uncertainty separately at 2–6 seats. Held-out seeds must remain outside tuning.
- Report meaningful attack opportunities taken/missed, expected versus realized combat losses, avoidable bankruptcy, idle materials, disconnected fleets, and technology follow-through. More attacks alone is not acceptance.
- Measure p50/p95/p99 compute, total user-visible wait, peak memory, nodes and simulation work on hosted runtime, plus concurrency/cost per completed match. No 30-second work repeated per microcommand.
- Replay full games through scoring without deadlocks; bounded relevant tests, changed-file lint and production build. Independent review and human games remain separate evidence.

## Delivery decisions, risks and rollback
Recommended sequence: stronger candidates/evaluation and tactical regression suite; compare against current AI; public-information simulation model and bounded search; durable action worker and difficulty settings; held-out tournament/performance tuning. Stronger heuristics are the foundation for both search ordering and its fallback policy.

Main risks are inaccurate simulations, candidate pruning that excludes the winning plan, information leakage, excessive server cost and turn delays, and an aggressive style that loses more often. Version the AI per match, retain the previous controller for comparison/rollback, and avoid changing authoritative rules to accommodate search. No release is proposed in this assessment.

## Source references
- [Convex execution limits](https://docs.convex.dev/production/state/limits): queries/mutations have a one-second user-code execution limit. Multi-second search belongs outside the committing mutation.
- [Convex actions](https://docs.convex.dev/functions/actions): scheduled action workflow and action errors/retries require explicit handling.
- [Military technologies](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/pjerUBJORJGu4DPIfpPeIA/military-technologies): Neutron Bombs and population destruction.
- [Grid technologies](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/-ufrIyuMSeqLw2Yi_zetRw/grid-technologies): Improved Hull enables ship upgrades.
- [Money and action/control costs](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/8ECYzJ8ORXKURzS3INZMxA/what-do-i-need-money-for), [civilization upkeep](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/yXQqyG0tQNy-sJ-7RRPS5A/civilization-upkeep), [Orion setup](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/GvE0RLjRSciZrzF9jhz_eA/orion-hegemony).
