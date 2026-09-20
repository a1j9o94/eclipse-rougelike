# Player feedback: visible costs, capabilities, and map connections

Outcome: experienced and new players can read technology prices, ship power/capabilities, wormhole orientation, ownership, and their private reputation without hunting or reverse engineering the UI.

Acceptance:
- Research shows printed base/minimum and current payable science, with discount provenance; selected-card confirmation retains the breakdown. Owned technologies use horizontal tracks.
- Outside-grid modules render beside normal blueprint modules without becoming install slots. Reactor used/produced/balance sits near editing controls; combat/movement summary is immediately visible.
- Highlighted sectors reveal printed wormholes on their neighbors. Placement distinguishes every printed exit from matched connections, with a legible legend and exploration ring tier on frontier targets.
- Ownership looks like a colored influence disc; decorative planet orb/VP removed from map, VP remains in inspection. Artifact and discovery use distinct reusable symbols.
- Command center shows private held reputation near top (never other players' values), colony ship availability at a glance, compact expandable empty-planet planning, and easy access to research tracks.

Work allocation: research agent, blueprint agent, map agent; root command center, shared symbol integration, browser verification and release. Each behavior gets failing regression before implementation. Run targeted memory-bounded batches, full lint and build. Review desktop/mobile actual screenshots before main push.

Risks: preserve rule calculations, privacy, keyboard access and mobile target sizes; avoid replacing usable information with unlabeled symbols. Pure presentation scope, reversible via Git; no saved-state migration.

## Additional user steering

- Keep explanations available under details instead of increasing paragraph density. Use concise labels with numeric/icon summaries.
- Remove exposed playable previews/sample positions entirely. Deleted the demo component and entry links, retired hashes now load the real game; internal fixture data stays out of the production import graph. Route regressions failed before removal and now pass. README notes historical walkthrough scripts that require a local harness.
- Add a simple multiplayer-only Elo leaderboard. Completed matches require at least two original human identities, AI-only seats never rated, solo excluded. Per-player wins/win percentage and expandable faction records. See `multiplayer_leaderboard.md` for scoring, undo, migration and tests.

## Integrated verification

Root reviewed actual board command-center screenshots at 1440×900 and 390×844, including private reputation and compact colony supply. Research, blueprint and map agents reviewed real component/board screenshots at those sizes; root independently inspected representative research, blueprint and placement images. Leaderboard cards, responsive layout and faction expansion reviewed at both sizes, mobile has no horizontal overflow. No human playtest of these new changes is claimed.

Root regression batch: 40 tests across command center, concurrent upkeep UI, sector planets, discoveries, retired routes and leaderboard UI. Agent batches: research 23, map 23, blueprint 30, ratings/backend lifecycle 35. Full lint and build required before release. No saved-game rule changes in the visual pass.

Full repository lint and production build passed after all edits (including Convex/app/domain type checking). Existing Browserslist age and chunk-size warnings remain. Production no longer imports the 800 KB demo fixture bundle. Backend deployed to the existing development environment first; main Git push supplies the Vercel frontend release.
