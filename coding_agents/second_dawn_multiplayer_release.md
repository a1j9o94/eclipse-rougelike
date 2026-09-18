# Multiplayer and visual faction setup — published

Public site: https://eclipse-rougelike.vercel.app/

Vercel deployment `dpl_3YnyGXqvAzCUAcEK4rLfwAVNwejx` is Ready: https://eclipse-rougelike-ly2f0fe4m-obleton-adrian.vercel.app

Convex remains the requested development deployment `ideal-nightingale-55`; final backend push includes authoritative AI-takeover history events. Existing solo matches and legacy data are preserved.

## Player flow

Choose **Create multiplayer room**, select a visual faction board and room settings, then share the invitation URL. Each friend chooses an unused faction/color and selects **Ready to play**. The host selects **Start room game** when all configured human seats are occupied and ready. Rooms support 2–6 total seats with optional Normal AI opponents, and 30-second to 48-hour turn timers.

The same owner's actions and chained decisions retain the deadline. On expiry, Normal AI finishes that turn through the existing private player view and legal command processor. Seat ownership/controller remain human; the player resumes next turn. Every takeover action is visibly labeled in public history. Private reputation values remain private. Guest credentials and server ownership govern access; the invitation URL is not a seat credential.

The visual faction picker is also available for solo setup. It explains faction advantages and constraints, starting resources, blueprint strengths, and technologies using the existing component icons and actual rule/catalog data. Solo start controls remain available beside the faction detail.

## Verification

- Focused one-worker suite: **398 tests in 79 files passed**. Production build, TypeScript, and changed-code lint passed. Full repository lint retains **88 existing errors and 12 warnings**, recorded separately in `logs/second_dawn_multiplayer_repository_lint.out`.
- Six-human room setup verifies all six alien factions, distinct colors, and individually owned private views.
- Reproducible complete two-human timeout game: test-only Mulberry32 seed `0x5eedc0de`, **197 accepted timeout commands**, finished room/timer, valid final scores, human controllers, and contiguous journal. Two repeated runs match.
- Local and production two-browser walkthroughs pass create/invite/join/faction/ready/start, matching authoritative views, outsider and wrong-seat denial, offline blocking, room URL reload, actual 30-second AI takeover, human return, and visible takeover history.
- Live solo create/save/resume/offline/reconnect/exploration/AI/history smoke passes after multiplayer deployment.
- Rendered lobby, faction selection, and match screens reviewed at 1366×768, 1440×900, and 1920×1080. No horizontal overflow or browser errors. Long faction details scroll; persistent ready controls remain available. Evidence is agent-operated review, not a claim of human usability certification.

Evidence: `second_dawn_multiplayer_browser/live/results.json`, `second_dawn_multiplayer_browser/live/timeout-history.png`, `second_dawn_revision_screenshots/faction-picker-review.json`, `second_dawn_deployment_live/smoke.json`, and `logs/second_dawn_multiplayer_final_*`.

## Remaining scope

Phone-specific layouts, accounts/cross-device credential recovery, expansions, and a scripted tutorial remain deferred. Guest ownership resumes in the same browser. The preceding visual action release and its reviewed v5 gameplay baseline remain available at the public preview route.
