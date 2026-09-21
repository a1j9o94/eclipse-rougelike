# September 20, 2026 — Rules, discovery reference, and header clarity

Outcome: comfortable rules selection in both setup paths, discovery planning directly in Command Center, and resource counters that remain separate from long faction names.

## Delivered
- Shared RulesModePicker gives each ruleset a padded full-width radio card, a short description linked for assistive technology, selected/focus states, and disabled behavior. Existing setup/save callbacks and forced Less Random warp exclusion remain intact.
- Command Center shows a collapsible, searchable reference to all 27 canonical Less Random discovery types. Public remaining counts update with the view; depleted types remain inspectable. Cards include effects and variant ship-part statistics. Standard mode never displays the public catalog. See [discovery audit](second_dawn_discovery_reference.md).
- Desktop resource counters reuse Money/Science/Materials symbols with accessible stock/income names and hover titles. The turn clock and long faction text stay within their layout bounds, with the full actor name retained in the title. Mobile keeps its existing resource symbols.

## Decisions and preservation
No authoritative commands, rules, RNG, storage, deployment configuration, or private projections changed. Browsing discoveries cannot submit anything. The reference describes implemented reward behavior and uses the canonical variant supply, rather than the hidden standard deck.

Existing settings navigation regression expected the entire dialog to have only one button, although audio controls now include buttons. Its assertion now counts the header's exit buttons, as the test title requires; toggle, close, Escape and focus assertions remain.

## Verification
- Clean startup: git fetch/pull on main, feature/less-random-discovery-ux branch, npm ci; baseline lint, bounded lobby/economy tests, and npm run build passed.
- Failing-first tests: three setup/header cases failed before implementation; discovery cases had three missing-panel failures before implementation.
- Final bounded integration: 60 tests passed across 10 files. Commands and output: [test log](logs/ux-clarity-tests.out).
- npm run lint and npm run build passed, including Convex codegen and Eclipse typecheck. Build retains existing large-chunk/Browserslist notices.
- React checklist: typed props, stable keyed canonical options, no effects for derived state, native labeled radios, explicit button types, accessible search/status and collapse state.
- Browser: agent-browser Chromium inspected actual lobby and temporary actual-engine board fixtures at 1366×768 and 390×844. Standard and Less Random desktop clock bounds end 8px before the first resource counter; no document horizontal overflow. All 27 cards render; searching reputation returns Ancient Might. Mobile discovery/cards and rules layout visually reviewed. Temporary fixture files removed.
- [Room rules](ux_clarity_screenshots/mobile-rules.png), [desktop discoveries](ux_clarity_screenshots/desktop-discoveries.png), [mobile discoveries](ux_clarity_screenshots/mobile-discoveries.png), [standard header](ux_clarity_screenshots/desktop-header.png).

## Follow-ups and rollback
Human newcomer/expert playtest remains pending. Suggested tasks: choose a ruleset and explain the difference; locate a discovery with a reputation benefit; identify each compact resource counter. Browser evidence is engineering validation, not human usability evidence. Revert this UI slice independently if needed. User authorized production deployment on September 20 and established automatic deployment after passing checks. Release through the existing main-only Git integration.
