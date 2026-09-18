# Map context and endgame release — 2026-09-18

This release combines three user-requested presentation fixes on the shared production/preview components:

1. Ambassador exchanges allow galaxy inspection via View galaxy / Explore, preserving the selected response, population cube and partner. Mac trackpad pinch uses map-scoped native wheel/Safari gestures.
2. Completed games have Return home, Play again and read-only final-galaxy inspection. Completed saves move into collapsed history. Faction cards and illustrated point sources replace plain score rows, preserving private reputation and authoritative ties.
3. Exploration places the preview tile on the shared galaxy with visible planets, advanced markers, discoveries, Ancient defenders and neighboring faction fleets. Saved draw/position/rotation legality remains authoritative.

## Evidence

- [Ambassador inspection](second_dawn_diplomacy_map_release.md)
- [Trackpad zoom](second_dawn_trackpad_zoom.md)
- [Visual scoring](second_dawn_visual_scoring_release.md)
- [Finished-game navigation](second_dawn_finished_game_navigation.md)
- [Exploration map and contents](second_dawn_exploration_map.md)
- Screenshot/browser artifacts: `second_dawn_diplomacy_map_review/`, `second_dawn_score_review/`, `second_dawn_exploration_map_review/`.
- Full memory-bounded suite: **605 tests / 123 files passed** (`logs/map_endgame_final_tests.out`), covering seeded full matches and UI/rules regressions. Final camera sizing refinement is additionally checked in its focused exploration batch.
- Production build and TypeScript passed. Repository-wide lint remains at the inherited **88 errors / 12 warnings**; changed code lint is checked separately.
- Browser workflows cover desktop sizes 1366×768, 1440×900, 1920×1080 and mobile 390×844. Native pinch streams are synthesized in Chromium/WebKit; physical Mac trackpad feel and human playtest evidence remain separate.

## Release discipline

Frontend-only changes: no Convex functions, tables, player credentials, saved games, RNG or game rules change. Publish through a main-branch Git push; preserve main-only Vercel deployment and its development Convex environment. No direct frontend deployment from a feature branch.

Reverting these UI commits is sufficient for rollback. All completed records are retained; completed history is a display grouping, not deletion. Play again opens setup without starting or inviting anyone until the player confirms.

## Final pre-release gate

Camera refinement: 12 exploration tests passed after the full suite, and the production build/typechecks were rerun successfully. All 25 changed code/browser-script files pass scoped lint. The five-size exploration walkthrough was rerun on the final camera implementation and its final screenshots were inspected, including Ancient contents, faction fleet selection and visible controls. Legacy exploration browser selectors were migrated from the former static image to the interactive region.
