# Independent game rules — engine delivery, September 20, 2026

Outcome: players can extend a Standard game or combine individual Less Random features, with the complete historical preset retained.

Acceptance criteria: round count controls cleanup/final scoring; all technologies, discovery visibility, reputation visibility, exploration, combat Jokers, inventory/development changes, and faction amendments work independently; private information remains private in mixed games; historical preset-only initialization remains stable.

## Decisions

- Setup resolves preset defaults plus optional overrides. Only supplied overrides are persisted. Round counts are integers from 1 through 20; invalid options and Rift combinations fail before initialization.
- Rift Cannons excludes combat Jokers and the variant technology inventory. Portal settings are independent for explicit customization; historical Less Random setup without an options object still disables portals.
- Technology inventory, market visibility, discovery inventory, discovery visibility, and reputation visibility are independent. Ancient Labs draws one hidden tile immediately when public discovery choice is disabled.
- Public continuation maps/supplies are empty for disabled features. Reputation return paths only synchronize public holdings with public reputation enabled.
- Exploration caps/multidraw/Joker and combat Jokers are gated independently. Engine trade execution, command preview, funding quotes and legal options use faction amendments independently.
- Historical Standard defaults remain eight rounds; Less Random defaults remain ten rounds. Cleanup uses the selected round count.

## Verification

The initial 12 focused custom-rule tests failed before implementation; all passed after implementation. Extended suite now has 17 custom engine tests. Two battle regressions also run with individual options enabled. Final focused checks: 49 tests across custom engine, battle engine and cross-system integration pass; preceding 43 core/catalog/exploration/combat/development/scoring/aftermath tests passed. Eclipse TypeScript and changed-file ESLint pass. Parent supervisor runs repository lint/build and consolidated relevant tests before automatic deployment.

## Risks and rollback

Mixed inventory/publicity combinations must stay synchronized across engine, projection and AI sampling. The audit agent owns those projection/AI checks. Configuration is fixed at game creation; saved preset-only matches use unchanged defaults. Revert this delivery as a unit if needed; no data migration is required.

## Result & Next Steps

Engine delivery complete. Parent integrates settings UI and backend; run consolidated quality gates and deployment verification.

Additional completion verification: three seeded full AI matches pass for ten-round Standard, Standard inventories with public technology/discovery and private reputation, and the Less Random preset with hidden variant discoveries/private reputation plus open technology and combat Jokers disabled. Each also samples twelve hypothetical worlds, checks option propagation and privacy, and executes legal sampled decisions. All complete their configured round count without deadlocks (3.1 seconds for this focused suite).

Final mixed-option review: an exhaustive bounded smoke covers all 256 Boolean feature combinations with ten rounds and two alien factions. Each setup resolves exact independent flags, produces legal commands, preserves intended inventories/Jokers and exposes no private reputation/discovery supplies. All combinations pass (18 custom engine tests total, 0.9 seconds).

Final review fix: hidden discovery draws and redemption of already reserved discoveries previously accepted a replacement discovery ID supplied by a client. Two new tests demonstrated the bug before the guard. Resolution now requires the fixed tile ID whenever there is no public tile choice, while preserving legacy client omission of the ID. Added public-supply rejection regression too. All 37 tests in custom engine (21), custom full AI matches (3), Less Random core (9), and integration (4) pass after the fix; changed-file ESLint passes.
