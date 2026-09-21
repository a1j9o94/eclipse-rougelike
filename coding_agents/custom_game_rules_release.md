# September 20, 2026 — Custom games and upkeep scrolling

Outcome: choose game length and mix rule groups independently, retain the complete Standard/Less Random presets, and freely scroll Command Center while upkeep decisions wait.

## Delivered experience
- Solo and shared room setup offer 1–20 rounds and independent controls for open technology, public discovery choices, public reputation choices, exploration, combat Jokers, revised technology/developments, revised discovery inventory, and faction rules. Warp portals and Rift Cannons are separately selectable components.
- Selecting either preset resets every option, including when reselecting the current customized preset. Individual edits retain the other settings. Rift Cannons are visibly unavailable with Joker tables or the revised technology inventory.
- Room agreements list the actual selected rules. Saves, AI planning, desktop/mobile round counters, scoring, public discovery reference and faction descriptions use the effective configuration. Standard games can run ten rounds with their original hidden information and inventories.
- Command Center scrolling during upkeep is restored. The active map alone locks workspace overflow; hidden maps in minimized decisions preserve their draft without preventing the empire content from scrolling.

## Preservation and decisions
Optional `ruleOptions` overrides are additive. Missing overrides retain historical Standard (8) and Less Random (10) defaults, inventories and privacy. Settings become fixed when the match begins; no migration of active games. The original preset identifier remains backward compatible.

Revised inventory and public availability are distinct options: opening the Standard discovery supply does not silently substitute Less Random tiles. Ancient Labs follows the selected public/hidden discovery rule. Public discoveries never reveal private reputation, including reputation-derived Ancient Might points. Reserved and hidden discovery rewards cannot be replaced by a client-supplied tile ID.

Exploration is one coherent group (multi-draw, redraw Joker, full outer stack, placement limits); technology inventory includes its developments; faction rules group trade amendments and Terran bans. These groups are described beside the controls.

## Evidence
- [Engine and full-match checks](custom_rules_engine.md): failing-first isolated behavior tests, all 256 Boolean combinations, three seeded complete custom AI games and historical regressions.
- [Boundary checks](custom_rules_backend.md): invalid round/compatibility rejection, room/solo persistence, preset reset, readiness invalidation, saved summaries and faction bans.
- [Privacy and AI review](custom_rules_audit.md): public projections, sampled worlds, scoring and effective faction descriptions.
- [Upkeep scroll diagnosis](upkeep_command_center_scroll.md): failing-first actual-CSS regression, desktop/mobile native scrolling, retained selected upkeep sector and locked active map.
- Final integrated gate: 175 tests across 29 files passed; full `npm run lint` and `npm run build` passed (Convex codegen, application/domain typechecks and Vite).
- Parent integration logs under `coding_agents/logs/custom-rules-*`; bounded one-worker suites rather than the complete historical suite.
- Actual browser setup at 390×844 and 1440×900: selected ten Standard rounds with open technology/discoveries and private reputation, then restored the complete Less Random preset. No horizontal overflow or browser errors. [Mobile](custom_rules_screenshots/mobile-custom-rules.png), [desktop](custom_rules_screenshots/desktop-custom-rules.png).
- Actual browser upkeep Command Center scroll reached 700px at both sizes, with pending choice retained. [Desktop](custom_rules_screenshots/upkeep-command-center-desktop.png), [mobile](custom_rules_screenshots/upkeep-command-center-mobile.png).
- Additional unrelated empire-board integration test retains a pre-existing Settings focus assertion failure when an unacknowledged turn-notice steals focus. It is outside this CSS change; selected upkeep navigation/scroll suites pass.

## Release and rollback
User preference authorizes deployment after lint/tests/build pass. Publish the additive backend to the existing `dev:ideal-nightingale-55` target before pushing main for Git-triggered Vercel production. Do not change deployment targets or remove existing saves. Retain new backend fields/handlers if rolling back the frontend, since custom matches may already exist. Exact deployment status and public-site smoke output are recorded in ignored release logs.

Human newcomer/expert playtesting remains distinct from browser engineering verification. Suggested task: create a ten-round Standard game with open technology only, explain which rules changed, then inspect Command Center during a required upkeep decision and return to it.
