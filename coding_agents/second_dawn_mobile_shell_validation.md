# Mobile shell implementation and review — 2026-09-08

## Outcome and acceptance

Use the same authoritative game and board controller from a phone-sized browser: persistent turn/resources/upkeep, a readable galaxy, four main destinations, a visual action chooser, an expandable inspector, and reachable confirmations. Navigation and camera changes preserve uncommitted drafts; authoritative pending choices always have a return path. Desktop remains the existing layout.

## Implementation decisions

- `SecondDawnBoard` wraps the shared controller in the per-match/per-seat draft provider. Mobile markup activates below 1024 CSS pixels or in coarse-touch landscape at 600 pixels high or less.
- Galaxy, Empire, Players and Activity are bottom navigation. Map targeting uses a compact peek inspector; planners expand within the available workspace. Research, blueprints, trade and decisions use the shared full-width workspace. Build uses its existing native modal.
- Research and exploration drafts have a direct context-footer confirmation. Server rejection status remains visible above navigation. Only explicit accepted command receipts clear matching persisted drafts; submitting a command does not prematurely discard it.
- Header and footer dimensions are observed from the actual main workspace. Inspector limits adapt to enlarged text, pending-return controls and status feedback. Peek state reserves map-control space.
- Mobile manual inspection suppresses automatic AI inspection across actor changes until the player explicitly watches/follows AI again. Automatic sheets only open on the Galaxy screen.
- Native WebKit blueprint civilization selection uses explicit 44-pixel appearance and a visible chevron. Text enlargement uses intrinsic card rows, wrapping budget/header content and wrapping navigation rather than clipped fixed rows.

## TDD and verification

- `second_dawn_mobile_shell.spec.tsx`: six focused tests cover navigation, map action selection, pending-choice priority/return, one expandable/dismissible sector inspector, AI not interrupting manual inspection, and visible server rejections. Manual-AI regression failed with a reopened peek sheet before the fix. Paired desktop AI-follow test still passes: seven tests total.
- `second-dawn-mobile-actions-review.mjs`: all six actions submitted accepted engine commands, verified from their newly appended action-history entries: Explore, Research Improved Hull, Build, Move, Influence refresh, Upgrade. The Influence branch now commits rather than merely opening. No stale notices appeared after successful acknowledgments; no horizontal page overflow.
- `second-dawn-mobile-shell-review.mjs`: current opening/research/blueprints/combat screenshots at 360×800, 390×844 and 430×932 (12 images) with viewport/document-width checks. Actual images reviewed for hierarchy, overlap and reachable controls. Research effects, blueprint hardpoints, distinct battle fleets and persistent status are readable; longer content scrolls in the workspace.
- `second-dawn-mobile-accessibility-review.mjs`: Research and Trade at 390×844 with conservative 200% text emulation and 844×390 landscape. Font sizes are snapshotted before any mutation to avoid recursive scaling. All document widths match viewport; footer measurement matches its actual height within two pixels. Research confirmation is clickable after scrolling the sheet and never covered by navigation. Six actual screenshots inspected, including enlarged and landscape confirmation states.
- Enlarged text review originally exposed overlapping stat labels and budget text, cramped navigation and a clipped inspector heading. Those were fixed and the current images reinspected. Enlarged text uses taller navigation/cards and leaves 386 pixels of main workspace at 390×844. Short landscape retains 167 pixels of scrollable workspace.
- Keyboard check: focus and Enter navigate Empire → Research → technology selection, then focus the visible context-footer Confirm. Captured `390x844-keyboard-confirm.png`.
- Map agent independently verified touch gestures, camera/draft reload, map targeting with the peek sheet, and WebKit. Its native-select height assertion failed before explicit styling and passed afterward.
- Scoped changed-code ESLint and `tsc -b` pass. Parent owns repository lint/build and full bounded test/deployment gates.

## Artifacts and limits

Images/results are in `second_dawn_mobile_review/`, `second_dawn_mobile_actions/` and `second_dawn_mobile_accessibility/`; logs are in `logs/second_dawn_mobile_*`. These are reviewed captures, not automatically accepted visual baselines.

Task walkthroughs were scripted browser tests and agent visual inspection. Early script wrong turns included choosing a fixture without the intended technology, attempting Activity while the action context footer was active, and opening Influence without committing; the final script explicitly handles those paths and verifies receipts. They are not human search-time or usability measurements. Chromium mobile/touch and WebKit emulation do not establish physical Android/iPhone performance, browser chrome behavior, or OS text-setting behavior; user device feedback remains the follow-up. No subjective human playtest evidence is claimed.

## Risks and rollback

Mobile shell presentation is CSS/media gated and reuses shared rules. Rollback can remove mobile conditional markup/styles while preserving engine, public history and saved match data. Very short landscapes and enlarged text intentionally require scrolling; persistent decisions and confirmation remain accessible. Root handles production rollout after final shared gates.
