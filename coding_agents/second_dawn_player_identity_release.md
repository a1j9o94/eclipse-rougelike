# Recoverable players and solo rooms — 2026-09-08

## Delivered behavior

New solo games use the same room ownership and save flow as multiplayer. One human plays 1–5 Normal AI opponents with no human deadline or timeout takeover. The explicit user preference is **Wait for me in solo**. Ordinary AI opponents still take their turns. Existing pre-room solo saves remain available.

Players may save a public username and optional 6–12 digit PIN. Every profile also receives a private recovery code. Registration attaches to the existing guest identity, retaining its games and seats. Sign-in on another device issues a fresh session for the same owner. Names alone and room links do not grant access. An authorized device can replace a lost recovery code. Original browser identity is retained across multiple player switches.

Home and room screens provide profile/sign-in controls. Game and lobby rosters display public names. Same-seat reauthentication resumes the active room. Solo room settings explicitly show Wait for me and omit timer controls; switching from an invalid multiplayer timer restores a valid stored default.

## Connection investigation

Fresh live-browser room creation worked before this change; the user's exact connection failure was not reproduced. Deliberately blocking the websocket reproduced the indefinite connecting state. New status explains offline connections immediately, explains stalled connections after ten seconds, and offers Retry connection. Retry reloads without deleting the browser identity; ordinary reconnect remains automatic.

## Verification

- Failing-first identity, profile UI, credential preservation, room reauthentication, solo timer, and connection regressions documented in the accompanying plan and agent reviews.
- Three isolated real browsers confirmed that PIN and recovery-code sign-in restore the same private seat and pending exploration decision, preserve pre-room solo saves, retain the original device credential, and survive reload. Wrong PIN does not switch ownership. A profile without a PIN works through its recovery code.
- Blocked websocket → guidance → Retry → restored connection with identical identity; offline/online automatic recovery passed.
- Two-browser multiplayer creation, distinct seats/factions, ready/start, authorized commands, private view filtering, offline guard, reload, and timed AI takeover passed against the updated development backend.
- Solo creation, save/resume, interrupted exploration, reconnect, history, and scheduled AI progression passed in a real browser.
- Independent review found and resolved original guest backup loss after repeated switching, same-owner room reauthentication, invalid hidden solo timer, and a recovery-code rotation race.
- Browser screenshots and walkthroughs are agent-operated evidence, not a human playtest. No authentication secrets appear in captured artifacts.

## Deployment

Convex development deployment `ideal-nightingale-55` updated successfully. Storage changes are additive; legacy deployment data is preserved. Vercel deployment `dpl_dTtkBE3z1JysyvGyg6nsYPZSfgPg` is Ready and aliased to https://eclipse-rougelike.vercel.app/. Immutable build: https://eclipse-rougelike-5k20yoq8i-obleton-adrian.vercel.app/. Both the live game and preview use this build.

## Validation limits

Full-repository lint retains its pre-existing 88 errors and 12 warnings. Changed-code lint is clean. Run the bounded Second Dawn suite rather than the memory-heavy legacy suite. Email recovery, merging unrelated guest profiles, and phone-specific layouts are not included. If all authorized devices and both recovery methods are lost, a username alone cannot restore access.

## Final gates

427 tests across 85 files pass in the memory-bounded Second Dawn suite. Changed-code ESLint passes. Convex code generation, TypeScript, Eclipse type checks, and production build pass. Logs: `coding_agents/logs/second_dawn_player_release_{tests,lint,build}.out`. Vercel Ready confirmed by CLI. Reviewed solo settings/lobby/game screenshots at 1366×768, 1440×900 and 1920×1080 have no horizontal overflow or browser errors; controls are legible and common actions remain accessible. See `second_dawn_solo_room_review/` and `second_dawn_player_access_independent_review.md`.

Live verification passed on the canonical Vercel URL after deployment: three-browser PIN/recovery resume and original guest preservation (`second_dawn_player_recovery_browser/live/result.json`); deliberately blocked connection with identity-preserving retry (`second_dawn_connection_recovery_browser/result.json`); solo autosave/reconnect/AI (`second_dawn_deployment_live/smoke.json`); and two-browser multiplayer with timeout takeover (`second_dawn_multiplayer_browser/identity-live/results.json`). All report zero browser page errors. Public site continues to use `ideal-nightingale-55.convex.cloud`.
