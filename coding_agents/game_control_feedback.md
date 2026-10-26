# Game control feedback — October 26, 2026

Outcome: the action-budget disclosure responds to an ordinary click without selecting text; selected player cards contain their full content; Rift backfire is both verified and visibly distinguished from misses.

## Acceptance and fail-first checks

- Replace the previously requested double-click gesture with native single-click disclosure behavior, based on the user's latest report. Verify repeated click/tap, Enter/Space, Escape, and no trigger text selection in a real browser. Detail text remains selectable.
- Reproduce the roster highlight overflow, then check three- and six-player tables at narrow and wide widths. Faction names, status, symbols and VP must fit their highlighted card.
- Verify Rift faces 5 and 6 through authoritative combat, including automatic allocations. Preserve combat rules. Add presentation regressions for a backfire-only die, a mixed damage/backfire die, and the resolved own-fleet loss. Ordinary blank faces must not imply backfire.

## Findings and decisions

The engine already applies compulsory Rift backfire separately from enemy allocations. Face 5 deals 3 enemy damage and 1 backfire; face 6 has no enemy damage but 1 backfire. The compact dice cards hide the detailed provenance and replace it with a generic damage count/miss marker, while the commit summary only counts enemy damage. Repair that presentation rather than changing established combat rules.

The table popover inherited a six-column roster layout despite its smaller width. Give each card explicit space for its symbol, wrapping description and VP, with a responsive number of complete cards per row.

## Validation and release

Run focused component and engine suites, real browser gesture and card-bound checks, full lint and build. Record final results here. Release uses the repository's standing Git-triggered deployment authorization. Rollback baseline: `43383afe062724a4ace5fcc03f2e91e29dfe6956`. No data migration is needed.

### Implemented and verified locally

- Native summary activation replaces click-count handlers; Enter/Space remain native and Escape restores trigger focus. Selection protection is scoped to the trigger.
- Responsive roster cards reserve room for faction symbol, wrapping identity/status and VP. The popup keeps its Close button below the persistent turn strip and owns vertical scrolling.
- Compact Rift dice display self-damage and a warning mark instead of a miss mark. The commit summary includes rolled self-damage. Resolved receipts and the affected persistent ship display actual friendly hull lost, taken from authoritative volley targets. A blank Rift face no longer claims backfire. No combat engine or economy calculation changed.
- Relevant verification: 17 economy/navigation component tests, 34 Rift/automation/simulation tests, and 36 combat component tests passed. The combat run exposed an existing expected phrase; restoring the accurate no-enemy-allocation wording passed both Rift UI suites afterward. Four new compact-feedback assertions were observed failing before implementation.
- Browser header checks: 24 cases at eight widths, including repeated clicks, keyboard activation, no selected trigger text and usable menus. Player-card checks: 10 cases at five widths with three/six players, including long names, complete border containment, accessible Close and real inspection clicks. Screenshots inspected on phone and desktop.
- Full `npm run lint` and `NODE_USE_ENV_PROXY=1 npm run build` passed. React review: no added effects, listeners, dependencies or requests; small derived presentation values use existing rule helpers/receipts, native disclosure semantics are preserved, and labels convey backfire without relying on color.

### Full-flow follow-up

- Real engine-backed browser resolution exposed a short-screen layout problem: the expanded automatic reputation reward hid the ship outcome and could push Continue below the viewport. Battle rewards now show the kept tile/result in a compact native disclosure. Its expanded contents own scrolling while the continuation retains its space. Nonbattle reward rendering is unchanged.
- Rift browser checks pass at 360×740, 390×844 and 1366×768: assign the real face-5 die, resolve through `processGameCommand`, project public history, preserve the same ship node, show its actual backfire destruction, expose the semantic die result to assistive technology, open/close reward details and continue to upkeep without sending another command. No page errors or horizontal overflow. Compact die text stays within its card; screenshots inspected.
- Semantic image roles now expose result-die labels in compact and expanded receipts. Two accessibility assertions failed before that correction, then passed.
- Final relevant totals: 91 component/engine tests across 15 suites and 37 real-browser cases. The large jsdom continuation test crossed its default five-second wall-clock limit during a combined run; isolated rerun with a 15-second test budget passed all three unchanged assertions (desktop 4.7s, mobile 3.8s).
- Broader verification found two existing failures in `second_dawn_automatic_reputation_ui.spec.tsx`: a nonbattle reward is inside the initially hidden Table & activity container. An isolated worktree at rollback baseline `43383af` reproduced the same two failures before interaction (one other case passes). This release leaves that unrelated behavior unchanged; evidence is `/tmp/reputation-baseline-43383af.log`.
- Durable browser commands: `npm run test:second-dawn:header`, `npm run test:second-dawn:player-cards`, and `npm run test:second-dawn:rift-feedback`.
