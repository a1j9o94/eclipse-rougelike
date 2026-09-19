# Second Dawn faction expansion engine

## Outcome

The `expanded-v1` profile adds Rho Indi Syndicate, Wardens of Magellan, Legion of Midas, and Heralds of Ragnarok to the shared deterministic engine. Games with no `factionProfile` remain pinned to the original twelve-faction roster, rules version, catalog version, faction-color constraint, setup, and trade rates.

## Acceptance criteria

- `base` and `expanded-v1` resolve to exact rules/catalog version pairs.
- Faction identity, emblem, ship design family, and physical `pieceColor` are separate persisted concepts. Historical seats without `pieceColor` resolve through `seatPieceColor`.
- All four factions have source-transcribed setup, home sectors, supplies, blueprints, costs, actions, trade, scoring, and resumable action state.
- Legal command generation is shared by human and AI play. Directional trade and funding candidates are bounded.
- Seeded two- through six-seat games containing every new faction finish eight rounds and score.
- Existing base games and snapshots require no migration.

## Source audit

The archived Drive files under `.second-dawn/faction-research/originals` are authoritative for this profile. The May 2026 trade amendment takes precedence over stale trade labels printed on older boards.
Registry provenance still identifies Rho Indi and Magellan as publisher content from Outcasts/Seekers. Midas and Ragnarok are marked as unofficial user-supplied Drive content; enabling them together is the separate `expanded-v1` rules profile.

| Faction | Exact archived source | Transcribed setup and board values | Rules implemented |
| --- | --- | --- | --- |
| Rho Indi Syndicate | `Outcasts and Seekers/Rho Indi rules.jpg`; `Outcasts and Seekers/03 Rho indi syndicate Outcasts starting sector.jpg`; `Outcasts and Seekers/03 Rho indi syndicate board Outcasts.jpg` | 3 Materials, 3 Science, 2 Money, 2 colony ships; Starbase and Gauss Shield; sector 236, 0 VP, 1 artifact, basic Materials/Money and advanced Science/Money; 2 Interceptors; actions 1/1/2/2/4/2; Interceptor 4, Cruiser 6, Starbase 4; no Dreadnought supply; two ambassadors. Interceptor/Cruiser initiative 3/2 and permanent Gauss Shield; Starbase permanent Gauss Shield. | Money after reputation draw is `tiles drawn - 1`; no Traitor VP loss; no Dreadnought construction; Science/Materials pay 3 for 1, Money pays 3 for 2 Science or Materials. |
| Wardens of Magellan | `Outcasts and Seekers/02 Warden of Magellan Seekers rules.jpg`; `Outcasts and Seekers/02 Warden of Magellan Seekers.jpg` | 3 Materials, 2 Science, 2 Money, 3 colony ships; Fusion Source; sector **233** (visually verified; OCR can misread it as 293), 3 VP, 1 artifact, basic Materials and advanced Science/Money; 1 Interceptor; standard actions, costs, supply, and blueprints. | One facedown setup Discovery Tile, resolved once when a fourth technology first enters one track; colony ship to any resource during action/upkeep, including bankruptcy rescue; +1 VP per ancient ship-part Discovery used even if removed later. |
| Legion of Midas | `NEW FACTIONS/02 Remaining Info Sheet and Rules of the new Factions/Legion of Midas rules Info sheet PRINT final.jpg`; `NEW FACTIONS/01 Faction Board Sheets/12 Legion of Midas.jpg`; `NEW FACTIONS/03 Starting Sectors/New Starting Sectors print sheet03.jpg` | 2 Materials, 3 Science, 4 Money, 3 colony ships; Advanced Economy; sector 277, 3 VP, 1 artifact, gray basic plus advanced Money/Science; advanced Money starts populated; 1 Interceptor; standard actions, costs, supply, blueprints, and 3:1 trade. | Once during a main action, buy one same-type activation: Explore/Research 3 Money, others 1; +1 when six or fewer influence/action discs remain after placing the main action disc. Influence buys one additional disc operation. Reactions receive no bonus. An affordable unused choice keeps an action open at zero until bought or explicitly ended. |
| Heralds of Ragnarok | `NEW FACTIONS/02 Remaining Info Sheet and Rules of the new Factions/Heralds of Ragnarok rules Info sheet PRINT final.jpg`; `NEW FACTIONS/01 Faction Board Sheets/13 Heralds of Ragnarok Board.png`; `NEW FACTIONS/03 Starting Sectors/New Starting Sectors print sheet03.jpg` | 2 Materials, 3 Science, 3 Money, 3 colony ships; Neutron Bombs; sector 299, 3 VP, 1 artifact, advanced/basic Money and basic Science; starts Cruiser; Interceptor/Cruiser cost 4. Interceptor has five cells (standard four including its blank, plus Hull), initiative 1. Cruiser has five cells (printed Hull removed, blank retained), permanent energy 1, initiative 2. | Main Move has Move 2 + Build 1; main Build has Build 2 + Move 1. Budgets persist separately and may be used in either legal sequence. Primary-action activation technologies add only to the matching budget. Passed reactions stay ordinary. Auto-completion occurs only when no remaining budget has a legal command. |

### Trade amendment precedence

- Rho's own sheet defines its directional rates. A Money trade is an atomic 3-for-2 batch. Receiving an odd number is therefore invalid because Rho has no generic fallback rate.
- The May 2026 house rules change Magellan to generic 2:1 and additionally allow 3 Materials for 2 Money or Science. `tradeQuote` selects the cheapest exact combination, so one received unit uses the 2:1 fallback and two use the 3:2 batch.
- The same amendment changes Ragnarok from its printed 3:1 label to 2:1.
- Midas stays at its printed 3:1 rate. Every base-profile faction keeps its existing rate.

## Shared contracts and decisions

- `FactionProfile = 'base' | 'expanded-v1'`; `profileVersions` is the only profile-to-version dispatch table.
- `GameSetup.factionProfile` is optional. Omission means `base`; historical `GameState` and `Seat` objects may omit profile and `pieceColor`.
- `listFactions()` returns the complete 16-entry registry. `BASE_FACTIONS` and `listFactions('base')` retain the legacy twelve entries.
- New commands are `{type:'convert-colony-ship',resource}`, and `{type:'buy-activation',action}`. Existing trade commands retain `amount` as the total received units.
- `tradeRates` exposes printed/amended batches. `tradeQuote` computes a constant-space, exact quote and rejects integer overflow or amounts that cannot be formed. `tradeResources`, funding, previews, legal commands, history, and AI use that authority.
- `ActionProgress.budgets` persists Ragnarok's cross-action budget. `paidBonusUsed` persists Midas's choice. Magellan's stored tile and resolved marker live in private state; its identity is omitted from the player view until resolution.

## Player-color compatibility

Expanded setup uses a seat-level `pieceColor` and checks six unique resolved colors. Old saves omit it and use the registry color through `seatPieceColor`. Base setup continues to validate the existing faction-color pairing, preserving current selection behavior. No further picker/color split is deferred; the optional field is the backward-compatible seat-schema bridge.

## Verification

- `npm run typecheck:eclipse -- --pretty false`
- `NODE_OPTIONS=--max-old-space-size=3072 npx vitest run --pool=threads --maxWorkers=1 src/__tests__/second_dawn_expanded_factions_engine.spec.ts src/__tests__/second_dawn_faction_registry.spec.ts src/__tests__/second_dawn_funding.spec.ts src/__tests__/second_dawn_legal_ai.spec.ts src/__tests__/second_dawn_actions.spec.ts src/__tests__/second_dawn_action_auto_advance.spec.ts --reporter=dot` — 68 tests passed after the final replay/post-combat additions, including complete two-, three-, four-, five-, and six-seat eight-round seeded matches covering all four factions.

## Risks and follow-ups

- This profile intentionally keeps the current eight rounds, private reputation, random draws, technology market, and base rules. Optional outer-sector, exploration, technology-removal, and other May 2026 house-rule variants remain separate future profiles.
- The registry reserves no scripting language or user-authored faction schema. Later factions should add typed capabilities only when their verified rules require them.
- The source archive proves printed rules and numeric component values. It contains no controlled playtest or comparative balance dataset, so this delivery makes no subjective balance or fun-strength claim; seeded completion tests establish legality, determinism, boundedness, and conservation only.
