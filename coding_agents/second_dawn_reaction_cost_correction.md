# Reaction cost presentation correction — September 19, 2026

Outcome: the UI accurately previews the influence and upkeep cost of a reaction after passing, matching the already-correct authoritative engine.

The earlier reaction UI mistakenly described reactions as requiring no influence disc. The publisher-verified [Dized Reactions Example](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/0gSMVzN9TWGt7awagK5zeQ/0ItTob6zRuefbYhjIQLtPA/reactions-example), reviewed September 19, explicitly demonstrates moving an influence disc from the track to the Build reaction space before taking one Build activation. This correction supersedes the no-disc description in the older `second_dawn_turn_order.md` audit; the engine itself never received that erroneous rule change.

ActionEconomy now treats a new Upgrade, Build or Move reaction as one activation and one influence disc. Before a command draft exists it forecasts the next disc's upkeep, and an authoritative command preview still supplies its exact projected resource/upkeep result. An already-open reaction has already paid that disc, so continuing correctly shows no additional disc and unchanged upkeep. Reactions-only status, one-activation limit, piece/resource/slot constraints and suppression of ordinary multi-activation faction badges remain.

UpkeepSummary now explains that each new reaction uses one influence disc, includes Next reaction / Next new reaction upkeep and money balance, and describes both actions and reactions in its disc explanation. It continues to show Passed outside the action phase.

TDD: corrected expectations and added ongoing-reaction cases failed first (7 failures). The final upkeep/reaction/affordability batch passes **19 tests**, and changed files are ESLint-clean. Evidence: `coding_agents/logs/reaction_cost_correction_red.out`, `reaction_cost_correction_green.out`, `reaction_cost_correction_lint.out`. Scope is the two presentation components and their focused tests; no authoritative engine, Board or command-center changes. Parent owns integrated build/release validation.
