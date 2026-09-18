# Connection recovery — 2026-09-08

## Outcome

Players can distinguish an offline browser or stalled game connection from normal startup and reconnect without losing their identity or games.

## Acceptance criteria

- Normal production connection and room creation still work.
- Offline state is explained immediately; a connection or guest session waiting longer than ten seconds offers recovery.
- The client continues Convex's existing automatic socket retries.
- Explicit retry recreates the client by reloading the current URL and does not clear storage or room links.
- An old successful save message cannot conceal a lost connection.

## Findings

An agent-operated fresh Chromium browser connected to the live Vercel site using `wss://ideal-nightingale-55.convex.cloud/api/1.26.2/sync`. Creating a multiplayer room succeeded and enabled Ready to play. No page or console errors occurred. The test room was left after verification.

Closing the websocket deliberately with Playwright reproduced the reported visible symptom: after 11.5 seconds, production still displayed only “Connecting to the game server…”, disabled Create multiplayer room, and offered no recovery control. This establishes the missing recovery experience, **not** the cause of the user's original connection problem. The original failure could not be reproduced on a normal connection.

The installed Convex React client exposes connection state and automatic transport retries, but no supported public reconnect operation. Explicit retry therefore reloads the page, preserving browser storage and the current room URL. No credentials, room tokens, or private data were recorded in evidence.

## Implementation and validation

- `ConnectionStatus` and `useConnectionRecovery` expose a shared UI for normal startup, offline state, delayed socket connections, and stalled session preparation.
- Four behavioral tests were written and failed first because the component did not exist, then passed: delayed socket recovery, offline/reconnected state, precedence over stale save status, stalled session preparation.
- Scoped ESLint passes for these files.
- Logs: `logs/second_dawn_connection_red.out`, `logs/second_dawn_connection_green.out`, `logs/second_dawn_live_connection_probe.json`.
- Browser screenshots: `logs/live-connection-initial.png`, `logs/live-connection-room.png`, `logs/live-connection-blocked-before.png`.

## Risks and rollback

Explicit reload discards only uncommitted UI drafts; accepted commands and player credentials remain saved. Rolling back the connection components restores the previous status presentation without changing server state. The supervisor owns integration into `SecondDawnGame`, final build verification, and deployment.

## Follow-ups

Verify the integrated page under deliberately blocked sockets, then reconnect with the same browser identity. Report the normal-connection success separately from the deliberately blocked-network reproduction; do not claim the original user's network cause was identified.

## Integrated browser verification

The local Vite application against the approved development backend passes `tools/second-dawn-connection-recovery-browser.mjs`: deliberately blocked websocket gets recovery guidance; Retry reconnects with the exact same browser credential; offline state appears immediately; restoring connectivity automatically enables room creation. Zero page errors. The blocked-state rendered screenshot was inspected at 1440×900: explanation, retry button, and identity-preservation note are visible and aligned.

`tools/second-dawn-player-recovery-browser.mjs` also passes using three isolated browser contexts. It registers a pre-existing anonymous solo player, preserves the old game, creates a new solo room without a timer, saves an exploration draw, and restores the exact pending choice, revision, and private viewer seat on the second device using the PIN. Wrong PIN leaves the current identity untouched. Recovery-code login, registration without a PIN, login to that code-only profile, refresh, and restoring the original browser guest after repeated switches all pass. No credentials, PINs, private codes, room links, or match IDs appear in recorded evidence.

Twelve browser screenshots capture the empty registration form, registered player, original pending exploration, and restored pending exploration at 1366×768, 1440×900, and 1920×1080. Registration/profile and restored-choice images were visually reviewed at all three sizes; fields, confirmation controls, player identity, and decision controls are readable, aligned, and free of horizontal overflow. The lobby continues vertically below the registration form on shorter screens as expected. This is agent review, not a user playtest. Evidence lives in `second_dawn_player_recovery_browser/local/` and `second_dawn_connection_recovery_browser/`.

## Final production verification

After the supervisor's Vercel deployment became Ready, **both browser harnesses passed again on `https://eclipse-rougelike.vercel.app`** against `ideal-nightingale-55.convex.cloud`. The three-context recovery test repeated all migration, pending-decision recovery, optional-PIN, wrong-secret, and original-guest-preservation assertions. The connection test repeated blocked websocket, explicit retry, offline detection, and automatic restoration. Both reported zero page errors.

Production evidence: `second_dawn_player_recovery_browser/live/result.json` with twelve screenshots and no horizontal overflow; `second_dawn_connection_recovery_browser/result.json` with the final public URL. Final rendered samples reviewed include the empty registration form at 1366×768, registered player at 1440×900, and restored pending exploration at 1920×1080. No new clipping or alignment defects appeared. Runtime logs are `logs/second_dawn_connection_browser_live.out` and `logs/second_dawn_player_recovery_browser_live.out`.
