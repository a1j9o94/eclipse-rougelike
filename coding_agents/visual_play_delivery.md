# Visual play delivery — October 25, 2026

## Outcome and principles

The player acts on a visible planet, piece, ship, technology or fleet, sees the local change and cost, and commits once. The approved scope is `eclipse_visual_play_plan.md`, including the user's subsequent corrections about combat, wormhole symbols and unclear disclosure affordances.

The follow-up critique was valid: a sequence of screenshot fixes is insufficient. This delivery therefore applies shared contracts across workspaces:

1. Controls look interactive before hover. Native disclosures use a bordered 44 px target, visible state chevron, hover and keyboard focus treatment; this includes Command Center income and upkeep.
2. Objects retain their place while choices change. Combat owns a persistent keyed battlefield. Fitting retains the selected hardpoint and capability changes above the parts list. Compact Build changes from catalog to map placement.
3. One activity, one visible commit and one exit. Shared `CommitBar` remains in normal flow; root navigation owns activity exit. Inspection controls move into deliberate disclosures, not extra rows above choices.
4. Current holdings appear once in the shell. Empty drafts have no synthetic cost/error ledger. Selected commands show immediate cost separately from deferred upkeep, using the authoritative preview.
5. One symbol means one feature. Wormhole Generator and board openings share `WormholeMark`; other established resource, part and structure symbols are reused.
6. Navigation preserves drafts. Undo targets the current activity, including undoing its reset; accepting a command clears only matching submitted values. Auxiliary actions use the shared action registry, including Recruit allies beside Colonize and Trade.

## Ownership and review evidence

- Selection/economy: `visual_play_selection.md`.
- Build/fitting/movement/influence: `visual_play_fitting.md`.
- Battle and pending choices: `visual_play_combat.md`.
- Shared shell, registry, economy timing, global affordances, draft scopes, map bounds and integration: supervisor.

Root fail-first checks cover empty costs, new versus continuing Explore disc use, desktop/mobile Recruit entry, engine-description removal, activity-scoped undo and undo after reset. Existing navigation, persistence, upkeep, accepted-receipt, diplomacy-map, action, and settings checks are rerun in bounded groups.

Browser review uses 360×740, 390×844 and 1440×900. Component assertions are not treated as layout acceptance. The review found and corrected real issues: short Build map height, oversized fitting summary inherited from an older grid, hidden parts viewport, wrapped fixed footers, competing Guild commits, and stacked discovery inspection controls. Final measurements and commands will be appended when the source is stable.

## Acceptance status

- Functional: implementation under final verification.
- Visual/interaction: integrated browser pass under final verification.
- Human experience: open. No newcomer or expert playtest has been conducted in this implementation session. Passing automated checks does not establish delight or eliminate the need for the plan's observed play sessions.

## Release and rollback

Release only after bounded relevant tests, full lint and required build pass. Follow the repository's authorized Git-triggered production release on the existing Vercel project. Rollback is the pre-change commit `f2066197b83641eea78468ab84a7dff800bccd70`.

## Final integration evidence

- Root shell/integration batch: 44 tests across 11 suites passed; subsequent pending-return overlap regression and its companion tests passed 4/4. An overlapping final core batch passed 43 tests across 5 suites; the final Shrine preview suite passed 6/6 after adding completed-row coverage. Counts are not added because suites overlap.
- Supporting automation/settings checks: 10 tests passed. Queue persistence/authorization/receipt checks passed 11/11 on isolated retry. Several parallel tool transforms temporarily returned ENOSPC despite ample disk/inodes; no data was deleted, and isolated reruns passed.
- A full fixture layout audit covered 87 renders plus 3 isolated late-game retries: no page errors, horizontal overflow or commit areas covered by phone navigation. This checks 30 saved positions at each target size, not all possible actions within those positions. New-game/free-form action and selected-state browser evidence is in the three slice ledgers.
- At 360×740: Build map has 246 px excluding map controls; Build footer58 px, Upgrade57 px, Move59 px, Influence58 px. At390×844 the Build map has278 usablepx. Fitting keeps the selected hardpoint and stats visible with152/262 px scrolling component viewport.
- Actual pointer and keyboard work: highlighted sector centers select rather than opening nested fleet inspection; explicit Fleet remains available. Discovery → technology inspection → Return restores the selected Keep choice, with no overlapping turn row. Combat remains one ship canvas and marks a destroyed ship from the accepted receipt even before history arrives.
- Real local Convex session: queued Plasma Cannon purchase persisted through reload in the same match, with unchanged resources while queued and no browser errors. This is server-backed queue persistence evidence, not evidence that the queued research executed.
- Shrine preview now shares the printed price table with legality, rules and its workspace. Engine comparisons verify immediate resource cost, new/continuing Research disc cost, and the visible influence reward for a completed Materials row; engine prices and rules are unchanged.
- `npm run lint`, `npm run build` (codegen, app and engine TypeScript, Vite), and `git diff --check` passed before release. Release verification will be recorded separately.

Functional and representative visual gates pass. Human acceptance remains open as above; this release is an implemented design pass under evaluation, not a claim of demonstrated delight or exhaustive UX completion.

Final auxiliary-action correction: Colonize's unrelated Finish Explore row is removed while the auxiliary activity is open. Its complete fixed chrome is now180px at360×740 (24.3%). The added fail-first regression and latest mobile regression group passed23/23, with a final11-test core/return subset on the shipping source. Mobile Back, score and map controls use44px targets; the compact resource control has an expanded44px pointer region.
