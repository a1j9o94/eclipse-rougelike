# Ambassador map inspection and pinch zoom — 2026-09-18

## Player outcome

During an incoming ambassador exchange or post-combat diplomacy, View galaxy opens the shared galaxy and sector inspector. The desktop Explore button provides the same inspection route. Return to ambassador exchange restores the selected response, partner and population cube. Mobile Galaxy navigation and Return to decision follow the same behavior. Inspecting does not submit a command, and remains available offline.

Mac trackpad pinch zooms the map around the pointer. Chromium ctrl-wheel and Safari cumulative gesture streams use native, map-scoped listeners; ordinary scrolling and pinch outside the map remain browser behavior. Touchscreen pointer pinch retains its existing implementation. See [gesture validation](second_dawn_trackpad_zoom.md).

## Decisions and review

- Preserve the keyed diplomacy panel mounted but hidden during inspection, so local choices survive navigation; a new decision ID resets the appropriate choice.
- Pending exchanges expose no new Explore action, build placement or movement command. Retained build drafts stay stored, but their controls, ghost pieces and layout are hidden while inspecting diplomacy.
- No authoritative rules, guest credentials, backend schema, or saved-game data changed. Frontend release follows main-only Git deployment.
- Independent review found the map header's inherited pointer-events rule blocked real clicks, and restored build mode could close the mobile inspector. Both fixed, with browser click checks and a saved-build-draft regression test.

## Validation

- TDD: three initial diplomacy tests failed before implementation; trackpad tests also failed before the native listener implementation.
- Memory-bounded full Second Dawn suite: **591 tests / 118 files passed** before the final restored-build and post-combat-partner cases were added.
- Final focused batch: **26 tests / 5 files passed**, including both additional cases, mobile shell, camera gestures and trackpad zoom.
- Production build/typechecks passed. Changed TS/TSX/browser scripts lint clean. Repository-wide lint retains the pre-existing **88 errors / 12 warnings**; this slice adds none.
- Real rendered browser walkthroughs at **1366×768, 1440×900, 390×844**: View galaxy, sector inspection, return, preserved Science choice, desktop Explore and mobile Galaxy navigation passed, with no page errors or document overflow. Evidence: [browser results](second_dawn_diplomacy_map_review/results.json), screenshots in the same directory.
- Screenshots inspected for visible map, readable sector details and accessible return/confirmation. Mobile details intentionally expand over the map with Show galaxy/Dismiss controls; Return to decision stays visible in the footer.
- Chromium and WebKit map gesture checks passed using synthesized native event streams. Physical Mac trackpad feel and human usability are not claimed as tested.

## Rollback and follow-up

Revert this presentation slice if needed; no migration or data rollback is necessary. After merging to main, verify the Git-triggered Vercel release and live fixture walkthrough. Human follow-up: pinch with a physical Mac trackpad and inspect a neighbor before accepting an exchange.
