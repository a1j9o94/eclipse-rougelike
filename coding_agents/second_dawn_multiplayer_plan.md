# Shareable multiplayer rooms

## User outcome
After the visual action release, friends can share a room link, understand and choose their factions, ready up, and play the same authoritative game with a turn timer and temporary AI takeover.

## Acceptance criteria
- Shareable `/room/<token>` routes survive refresh. Browser guest credentials own individual seats; invitation tokens are not ownership credentials.
- Configure 2–6 players with optional AI, a 30-second to 48-hour timer, and base warp portals. Distinct board colors, visual faction effects, readiness, and host-only start are enforced server-side.
- Every configured human seat must be filled and ready. Roster, settings, or faction changes clear readiness.
- Players see live public updates plus only their own private state. Existing commands, revisions, journal, autosave, reconnect, and solo saves continue working.
- Same-owner commands and chained decisions retain the deadline. On timeout Normal AI finishes that owner's turn/decisions, through filtered views, then the human resumes when next active. Failures are visible and retryable.
- Timer countdown, actor, and takeover status stay visible in the game; reload cannot extend a deadline.
- Review room/faction screens at 1366×768, 1440×900, and 1920×1080; run multi-browser create/join/choose/ready/start/play/timeout/reconnect checks against development Convex before public deployment.

## Test list (must fail first)
1. Room settings bounds, readiness, distinct colors, same-owner timer retention and owner changes.
2. Convex room privacy, host/seat ownership, concurrent joins, atomic start, seat views, stale scheduled tasks, AI takeover through chained decisions, failures/retries and existing solo compatibility.
3. Visual faction choices, actual faction advantages/disadvantages, unavailable colors, keyboard controls, room readiness and timer controls.
4. Browser multi-session joining, live views, save/reload, private reputation, 30-second timeout and human return.

## Risks and rollback
Storage is additive/versioned. Preserve existing solo matches and legacy tables. Publish the completed visual changes before enabling room APIs. Server timers own timeout decisions; client countdowns are informative. Deploy room backend to `ideal-nightingale-55` and use the same environment for Vercel.

## Decision log
- User selected **AI takeover** on timeout. Persistent seat ownership/controller remains human.
- A different decision owner gets their own full timer; same-owner decisions share the existing deadline.
- No login or cross-device identity recovery in this slice; same-browser room links and guest credentials resume existing ownership.

## Follow-ups
Record concrete backend/browser/visual validation and deployment IDs here after implementation.

## Independent backend review — 2026-09-07

`src/__tests__/second_dawn_multiplayer_review.spec.ts` adds independent Convex coverage for unauthorised faction/settings/ready/start mutations, an actual two-guest concurrent claim of the final human seat, duplicate board-color rejection, host departure and readiness reset, late-command rejection with duplicate receipt replay, and seat-specific private views/pending decisions. It passed with:

```sh
npx vitest run src/__tests__/second_dawn_multiplayer_review.spec.ts --pool=forks --poolOptions.forks.singleFork=true
```

The review found the room ownership and timer-entry paths aligned with the contract. `listMyRooms` relies on the `eclipseRoomSeatsV1.by_guest` index; verify that schema index remains present in the deployment payload. The scheduled `syncRoomTimer` path and persistent timed-out status need their existing backend-focused coverage before deployment, because browser UI cannot establish those concurrency guarantees on its own.

## Two-browser development deployment check — 2026-09-07

After the Convex development push, `node tools/second-dawn-multiplayer-browser.mjs` passed against `http://127.0.0.1:5175` with `ideal-nightingale-55.convex.cloud` as the authoritative backend. It used two isolated Playwright browser contexts and verified:

- Host creates a 30-second, two-human room; a separate guest follows the invitation route, selects a different board color, joins, and both seats ready before host start.
- Both guests receive the same persisted match while retaining distinct private seats; an unrelated guest receives no match view and the inactive former actor cannot submit the next player's turn.
- A real accepted action propagates to the other board; offline UI disables submission; loading the invitation route again resumes the same room match.
- The 30-second timer invokes Normal AI for the expired human seat, returns the turn to the host, and leaves the expired seat controller as `human`.

Six screenshots were captured in `coding_agents/second_dawn_multiplayer_browser/` for lobby and playing states at 1366×768, 1440×900, and 1920×1080. All automation overflow checks were false; independent visual inspection of the 1366 and 1920 lobby/playing captures found readable controls and no clipping. This is agent browser evidence, not a human multiplayer playtest.

Visual follow-up: on the 1366 and 1440 lobby captures, the sticky ready/start footer overlaps the lower portion of the selected faction detail. It does not hide the ready/start controls and the detail remains available by scrolling, but future polish should reserve bottom scroll space or reduce the footer's opaque coverage.

## Production verification — 2026-09-07

Ran the same two-browser harness against `https://eclipse-rougelike.vercel.app` after Vercel deployment `ly2f0fe4m`, with the development Convex deployment as backend. Every check passed: creation, invitation route, distinct guests and factions, ready/start, same-match state, read-only privacy/ownership enforcement, correct/wrong seat commands, offline guard, room-route reload, 30-second Normal AI takeover and return to its human seat, and public takeover history. No browser page errors were recorded.

Production evidence is in `coding_agents/second_dawn_multiplayer_browser/live/`. `timeout-history.png` visibly shows the `AI takeover ·` prefix for every timeout-driven command; the harness also asserted the same prefix from the server's filtered history query.
