# Independent game settings audit — 2026-09-20

Outcome: players can choose game length and individual variant features, while Standard and Régis’s Less Random remain complete presets. Read-only source audit; no behavior changed by this artifact.

## Suggested groups

Persist a resolved options object separately from the preset label. Existing saves without it resolve from `rulesMode` (missing/standard = original behavior; Less Random = every legacy feature and ten rounds). Prefer one resolver used by engine, AI, protocol and UI.

| Setting | Current behavior to own |
| --- | --- |
| `roundLimit` | Finish condition, board/mobile/attention/saved-game denominators, final heading, AI income/research/value horizon. Validate a bounded integer. |
| `openTechnology` | Put all permitted physical technology copies in the initial market; no later replenishment. This need not change which technology catalog is permitted. |
| `publicDiscoveries` | Select from shared face-up inventory, sector/aftermath discovery handling, Magellan initial reservation, discovery reference. |
| `publicReputation` | Public supply and tracks, initial Eridani draft, combat draft, diplomacy/minor-species tile returns, public scores. |
| `explorationChoices` | Two candidates (three for Draco), full outer-sector deck with existing map cap and per-round placement limit, exploration joker and unused-joker VP. These are a coherent exploration module; individual toggles are possible if requested. |
| `combatJokers` | Five starting Super Jokers and deterministic-volley decision before rolling. |
| `developments` | Ancient Labs and Quantum Labs, research UI/commands and filled Quantum Labs VP. |
| `factionAdjustments` | Variant Terran/Eridani/Mechanema trade plus Terran alien bans and opponent selection. Trade and alien-ban settings can be split further. |
| `variantComponents` | Revised technology inventory (remove Warp Portal, Flux Missile, Neutron Absorber and Rift Cannon; add variant technologies), revised discovery inventory and missile parts, no warp-sector module. This is distinct from revealing inventories. |

The exact grouping is a product decision. Avoid claiming every rule is independent if choosing an open inventory silently also enables jokers, public reputation, altered trades, ten rounds, or component removals. Preset selection should assign explicit defaults; edits should show Custom while preserving remaining selected features.

## Concrete coupling and required updates

- `shared/eclipse/setup.ts` currently derives every feature from one boolean, including random draw order, Terran validation, all market tiles, revised inventories, public draft setup, joker initialization, and sector discoveries. Split those branches, preserving unchanged RNG calls for historical defaults.
- `supplies.ts:createTechnologyBag` conflates component substitutions with availability. `prepareSectorStacks` already accepts its own all-outer flag. `discoveries.ts` already has separate standard and revised supply constructors.
- `actions.ts`, `decisions.ts`, `rounds.ts` govern all discovery entry points (exploration, research/Magellan, Ancient Labs, post-combat) and exploration quotas. Shared `rulesState.ts` prunes queued public discovery choices; retain that pruning for mixed settings.
- `battleEngine.ts` has separate mode branches for reputation and Super Jokers. Its reputation resolver also falls back to public arrays solely because `lessRandom` exists.
- `developments.ts` assumes Ancient Labs always exposes the entire discovery supply. If developments can be enabled with hidden discoveries, consume one hidden tile and offer ordinary keep/use. Do not send all available IDs. Quantum Labs itself works independently.
- Trade setting must reach `catalog.ts:tradeRates/tradeQuote`, `economy.ts`, engine validation/events, legal actions, funding/command previews, AI and three resource/funding UIs. Changing only actual payment creates misleading previews and invalid funded commands.
- Terran bans are checked in `setup.ts`, `multiplayer.ts`, both Convex entry points, readiness and AI faction allocation. `factionPresentation.ts` independently describes public reputation, exploration, trades and bans; a single mode argument no longer suffices.
- Round count is hardcoded in `rounds.ts`, `ai.ts`, `aiEvaluation.ts`, `aiMinorSpecies.ts`, `MobileHeader`, `SecondDawnBoard`, `SavedGames`, `ScoreWorkspace`, `TurnAttentionNotice`, rules descriptions and lobby summary. Finish with `>=` configured limit. `ai.ts` also has a standard discovery early-use cutoff (`round < 7`) that deserves game-length-aware evaluation.
- `aiWorld.ts` reconstructs public/hidden reputation, discoveries, sector associations, technology bag, and supplies. Resolve each setting independently and carry resolved settings into sampled worlds, or AI simulates different rules from the real game.
- Persist/validate settings in `types.ts`, multiplayer settings, Convex validators/schema/room serialization/create/start, matches creation/list summaries and frontend API types. Updates must clear ready state, remain stable on reload, and be host-only through existing authorization.

## Privacy traps

`protocol.ts` publishes the entire `LessRandomState`. Merely creating this object for discoveries or exploration must not populate hidden reputation/discovery arrays. Initialize disabled public supplies/maps as empty and gate all mutation paths, especially `engine.ts` ambassador exchange and `minorSpeciesRules.ts` reputation replacement, which currently publish reputation whenever `state.lessRandom` exists.

Gate score visibility on public reputation, not preset name. Discovery bonus Ancient Might depends on reputation: with public discoveries and hidden reputation, exposing an eliminated player's frozen `variantVp` can disclose hidden reputation information even after subtracting the reputation category. `protocol.ts`, `runningScore.ts`, `publicInspection.ts`, `aiEvaluation.ts`, and score/roster UI must consistently conceal the reputation-derived bonus before final scoring. Public artifact, development and unused-joker VP remain visible independently of reputation.

Reserved Magellan discovery is public only when selected from a public supply. Hidden initial discovery must retain the existing private-state redaction. Discovery reference must use actual enabled catalog and supply, not assume every public discovery game uses the forty-tile variant catalog.

## Failing-first acceptance tests

1. Standard rules at ten rounds continue after round eight and finish at ten; headers, reload/list metadata, AI sampled worlds use ten.
2. Each individual toggle leaves other features off: initial supply/market counts, no unexpected setup decisions, ordinary trades, standard reputation privacy, no unsolicited jokers.
3. Full preset preserves current Less Random tests; omitted settings preserve historical standard seeded setup and old Less Random saves, including pending decisions.
4. Public discoveries + hidden reputation: exploration and aftermath choices work; both player views and frozen eliminated scores conceal hidden supply/tracks/Ancient Might contribution.
5. Hidden discoveries + developments: Ancient Labs reveals exactly one tile to its owner, consumes it once, never broadcasts remaining IDs; Quantum Labs stays usable.
6. Public reputation + standard discoveries: setup/combat drafts and returned tiles work without exposing discovery order or Magellan's stored tile.
7. Custom AI choices remain legal and sampled worlds preserve selected modules. Target short matches and existing feature suites, never the complete memory-heavy suite.
8. Solo and room creation persist settings; room editing/readiness, Terran bans, invalid round inputs, restart/reconnect and saved-game cards match selected rules.

## Result and next steps

Audit complete. Implementation should choose the offered groups, record any cross-feature interpretation, add mixed-feature privacy tests first, and run focused tests plus lint/build before the authorized main deployment. Rollback is a feature revert; existing saved settings must remain readable if any custom games have already been created.
