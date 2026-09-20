# Régis's Less Random mode

Outcome: players can start and finish a separate, source-backed ten-round variant with deliberate exploration, research, discoveries, reputation and limited combat luck control.

## Acceptance
- Standard matches and historical snapshots keep their original rules, supplies and privacy.
- Solo/room setup persists an explicit versioned mode. Supported factions use the May 20 2026 amendments, Terran bans and finite inventories.
- Every new decision is authoritative, resumable, available to fair AI and usable on desktop/mobile.
- Exploration, custom content, public reputation and combat Jokers follow the archived document and its embedded images.
- Bounded behavioral/replay/privacy/backend/UI tests, lint, TypeScript, production build and rendered browser walkthrough pass.

## Work split
- Terra core: versioned mode, setup, exploration, economy, round progression, views.
- Sol combat: source Joker tables, staged rolls, deterministic reputation budgets.
- Terra interface/persistence: setup, rooms, decision cards, public information, dynamic round labels.
- Supervisor: source catalog/components, developments, AI integration, cross-system testing and final review.

## Source and decisions
Authority: `.second-dawn/faction-research/originals/My House Rules Less Random and Fairer Games Eclipse Last MODIFICATION 20 MAY 2026.docx`, archived in the [source release](https://github.com/a1j9o94/eclipse-rougelike/releases/tag/faction-sources-2026-09-19), compiled/adapted by Régis Étienne. Inventory and original contributors remain in `faction_research/`.
- Implement supported factions first; unavailable species are not placeholders.
- Ten rounds and ordinary outer placement caps. Explicit optional slower/less-aggressive and enlarged outer caps are excluded.
- Exact source inventory excludes Rift Cannon/Rift Conductor; Standard retains current Rift support. No unverified Joker interpretation for Rift dice.
- The rare Flux Missile is removed; a distinct regular Military Flux Missile replaces it (three copies).
- No existing saves or live games are migrated.

## Tests (must fail before implementation)
- Mode defaults/version pinning; exact inventories and conservation; multi-draw exploration, redraw, placement caps.
- New content acquisition/cost/effects, outside-track developments, score bonuses and trade ratios.
- Public reputation spending/supply, all Joker table rows, roll acceptance/retries and no NPC Joker access.
- Room/solo persistence, mode UI, historical private view, dynamic round count.
- AI fair views/candidate coverage and seeded two-to-six-seat full games.

## Risks and rollback
Source imagery must be read rather than inferred from OCR. Expanded choice spaces can slow AI; use existing bounded budgets. Changes live on feature/less-random-mode. Revert code before rollout; once games exist, retain version handlers for those matches.

## Validation
Startup npm ci, lint and build passed. Targeted tests use one worker; the complete suite is intentionally not run due repository memory constraints.

- 130 targeted integration, room, research, fitting, protocol, AI and mode tests: initial run exposed a Standard room readiness-message regression and a fixture with an outstanding AI setup decision. Both corrected; affected suites rerun green.
- Convex tests additionally exposed missing validator cases for development commands and named public discovery choices. Added the exact shapes; these tests exercise the deployed mutation boundary, not only the pure engine.
- Quantum-slot combat estimates initially ignored Antimatter Splitter; a failing comparison against the same tracked technology drove the fix.
- Seeded Normal AI games finish rounds 1–10 at all supported counts (2–6), plus a four-expansion-faction game. Hard search is invariant to changed hidden state with the same public view. This establishes completion/fairness, not a new measured AI strength claim.
- Public reputation choices exercise ownership, duplicate/stale rejection, journal-once, mode persistence and reconnect. Historical Standard privacy and eight-round tests remain green.
- Browser review uses ignored deterministic local harnesses with the production board, not public preview routes. Reviewed 390×844 and 1440×900 decision renders; visual fixes enlarge colored dice labels, make the discovery supply searchable with inline confirmation, and give reputation spending a visual draft with undo.
- No new human playtest evidence is claimed. Screenshots are review artifacts, not automatically accepted snapshot baselines.

Final verification and release details are recorded in `less_random_validation.md`.

## Decision log
- Mode `less-random-v1` is pinned in setup/snapshots/room settings; absent mode remains Standard. No migration.
- Mixed-color Super Joker table assignment is underspecified by the source. Use stable persisted die order and show every substituted color/face before spending; no hidden optimization.
- Magellan chooses a public starting discovery and reserves it until the fourth tracked technology. Its reservation remains public and clears on redemption; Quantum’s outside slot does not advance the track-count trigger.
- Exact source contains 124 research tiles plus two singleton developments and 40 discovery tiles. Revised missiles have distinct IDs so existing loadouts retain their old values.
- New developments currently use the ordinary resource conversion controls before acquisition when funding is needed.

## Follow-ups
- Human playtesting of the larger public discovery market and Joker cadence.
- Future supported factions can add their source-specific rules; no unavailable species are selectable placeholders.

Final targeted regression batches: 130 integration/mode tests, 71 Standard/protocol regression tests (includes three overlapping Convex tests), and 10 visual-component tests passed. Further review added explicit regressions for combat-aftermath public discoveries, global outer placement cap bypass, and Joker redraw UI state.
