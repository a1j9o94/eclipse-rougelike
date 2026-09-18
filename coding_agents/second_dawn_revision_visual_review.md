# Independent revision visual review — 2026-09-07

Reviewer: delegated coding agent, inspecting actual rendered PNGs. This is independent model review, not human aesthetic approval or a human playtest.

## Scope inspected
All 21 images in `second_dawn_gameplay_screenshots`: opening, crowded midgame, late game, research, blueprint editing, combat, final scoring at 1366×768, 1440×900 and 1920×1080. Capture completion verified in `logs/second_dawn_revision_capture.out`. Also inspected `second_dawn_revision_screenshots/1366x768-{planets,diplomacy,cruiser}.png`; those earlier screenshots precede compact planet and shipyard layout refinements.

## Findings
- **Fix before accepting the set:** blueprint editing at 1366 and 1440 preserves the scrolled location of the clicked Edit button. The first rendered editor view shows the comparison table and hides the silhouette/part controls above. The 1920 viewport happens to avoid this. Root notified and implementing workspace scroll reset. Reinspection pending refreshed captures.
- **Minor visual collision:** opening home-sector population symbols intersect the lower wormhole rings, most obvious at 1920. Suggested moving the symbol row upward inside the sector.
- **Misleading final-state status:** final scoring still displays a projected upkeep shortfall. No upkeep remains; suggested a completed-state indicator instead.
- **Context mismatch:** combat's unused inspector still says Select a sector. The main battle panel is readable, but the inspector should carry battle context or omit the prompt.

## What is readable and coherent
The horizontal civilization ribbon keeps all six seats and public scores visible without a left panel. Header resources, turn and current score do not collide at any tested size. Gold/bronze framing, original atmospheric artwork and physical sector outlines now share a consistent visual treatment. The galaxy remains distinct from interface surfaces.

Research shows four tracks side by side at all three sizes. Gluon Computer's computer +3 and energy −2 are legible immediately; effect values dominate the card while descriptions are secondary. Weapon colors supplement glyphs and text, not the only identification. Research card borders and text fit without horizontal clipping.

Sector ownership uses numbered discs in addition to color. Full-galaxy fit at 1366 necessarily makes detailed fleet labels small; territory zoom, Fit and the minimap are visible. At territory zoom some remote sectors intentionally extend outside the viewport; this is navigable board space rather than accidental UI overflow. The legend and map controls do not overlap each other.

Selected-sector planets now enumerate money/science/materials, advanced status and occupancy in compact cards. At smaller heights the inspector scrolls to remaining details; at 1920 all six center-sector spaces and core features are visible. The diplomacy rack visibly separates ambassador slots and reputation tiles and states the 4–6-player restriction in a three-player fixture.

Combat's miss and hit dice are distinguished in plain text; the target selection and confirmation are visible at 1440 and 1920. At 1366 additional decision content is below the scroll fold, without being permanently inaccessible. Final standings show all six civilizations at 1366 with expandable breakdowns and an explicit final reputation note.

## Acceptance status
No baseline files changed. Awaiting root's editor-scroll fix and follow-up images before closing the main navigation finding. The comments above do not establish human preference or attractiveness; user review of the new direction remains the human evidence.

## Follow-up closure after fixes
Reopened refreshed blueprint images at all three sizes plus 1920 opening, 1366 scoring and 1366 combat. All four reported findings are resolved:
- Editor now starts at its title, class switcher, silhouette and part cards. At 1366 the fourth interceptor slot is below the fold, while its installed component is also visible in the inspector; scrolling reveals editable remaining slots.
- Population symbols sit above lower wormhole rings, preserving a visible gap.
- Finished-game header now reads Game complete / Final / All points scored.
- Combat inspector now explains the active allocation decision and identifies the battle sector.

No unresolved clipping, overlapping chrome, unreadable primary values or navigation blockers remain in this reviewed set. This set is suitable for an explicitly reviewed visual baseline; no baseline mutation was made by this reviewer. This remains model visual review, not user aesthetic approval. The user should judge the revised visual direction in actual play.

## September 7 final action-planner review

Re-ran `tools/second-dawn-gameplay-visual-review.mjs` and inspected every actual image in the 21-screen set: opening, crowded midgame, late game, Research, blueprint editing, combat allocation and final scoring at 1366×768, 1440×900 and 1920×1080. These contain the current public scores, upkeep preview, researched technology collection, visual science prices and stronger territory treatment. No new blocking overlap or hierarchy defects were found in this set. The laptop blueprint editor and detailed sector inspector intentionally scroll for remaining content; the initial editor begins at its heading and first slots, with the current four-part loadout available in its inspector. The focused galaxy camera crops distant territory; Fit provides the full overview. No baselines were changed by this reviewer.

Additional Build and Movement workflow review found and fixed three visual defects, coordinating with their implementation agents:

- Native Build dialog had lost automatic centering due CSS reset. Explicit `margin:auto` centers the popup at all three sizes.
- Global button padding pushed the Build stepper glyphs toward the bottom of their 28px controls. Explicit zero padding and grid centering fix them.
- Movement's nested sticky confirmation overlaid its economy preview, and inherited paragraph/panel spacing pushed content below the laptop footer. Component-specific compact styles and normal-flow confirmation remove the overlap. At heights up to 800px, the redundant three-step instruction line is hidden while ship choices, route, costs and confirmation remain visible. The tested one-ship route ends with its Confirm button at y648, above the footer at y687.

Funded Build fixture: `opening-three`, one Dreadnought costing 8 materials with 4 held. The popup shows 12 money exchanged for 4 materials, 15 money after upkeep, and explicit `Convert & build`. All six component cards, their unavailable reasons, funding, upkeep and footer fit at each reviewed size. Movement fixture: `workflow-move`, select Interceptor 1 and sector 314; the selected destination ring, route 222 → 314, influence-disc effect, upkeep and confirmation are readable. Root separately removed exploration targets during movement to prevent unintended action switching.

Evidence: `tools/second-dawn-planners-review.mjs`, `tools/second-dawn-enlarged-planners-review.mjs`, six `*-build-planner.png` / `*-move-planner.png` captures, and two `1366x768-*-125percent.png` captures in `second_dawn_revision_screenshots`. The enlarged check applies `html {font-size:125%}` (it scales rem-based text, not every fixed-pixel label or the whole browser). Both confirmation controls remain reachable with visible solid keyboard focus after Tab/Shift+Tab; neither screen produces horizontal overflow. Build confirmation is fixed in its modal footer. Movement remains internally scrollable for larger fleets, and confirmation no longer covers any cost explanation. Review scripts pass ESLint. Engine/workflow tests and final build are owned by root and implementation agents.

This is independent agent image and browser-task review. It does not establish human aesthetic approval, timed human task performance or complete accessibility conformance.
