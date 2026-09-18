# Second Dawn multiplayer backend

## Outcome

Players can create and share a guest-backed room URL, select distinct base factions, ready their seats, and have the host begin a 2–6 seat game with optional Normal AI seats. The resulting match keeps the existing authoritative snapshot, private views, ownership checks, journal, and solo save format.

## Versioned storage and public API

New isolated tables use the `eclipseRoomsV1` prefix and reference existing `eclipseGuestsV1` and `eclipseMatchesV1` rows. No legacy `rooms`/`players` tables or solo match fields are repurposed.

| Function | Caller | Result |
| --- | --- | --- |
| `createRoom` | guest | Creates a replay-safe, mutation-scoped random URL token, host seat, settings, and returns public lobby metadata. Guest credentials remain cryptographically generated and hashed. |
| `getRoom` | anyone; credential optional | Returns lobby metadata only: token, status, seat slots, factions/colors, readiness, settings, and viewer slot. It never returns guest IDs, credentials, hashes, or game private state. |
| `joinRoom` / `leaveRoom` | guest | Claims/releases one waiting human slot; joins reject invalid credentials, closed/started rooms, and capacity. |
| `chooseRoomFaction` | seat owner | Selects an unclaimed base faction/color and resets every human ready flag. |
| `updateRoomSettings` | host | Changes human/AI slots, portal setting, or timer after capacity checks and resets ready flags. |
| `setRoomReady` | seat owner | Marks only that occupied human seat ready. |
| `startRoom` | host | Requires 2–6 total seats, every configured human slot occupied/ready/faction-selected, and no repeated faction/color; creates the ordinary match and ownership rows. |
| `retryRoomTimer` | room participant | Requeues a durable failed timeout job after visible failure. |

The share path is `/room/<roomToken>`. The token identifies a lobby but cannot submit commands or reveal another guest's private game information.

## Timer semantics

The selected duration is an integer from 30 seconds through 48 hours. It is persisted once the host starts the room.

1. Timer target is the current pending-decision owner, otherwise the active seat.
2. A target is `{ seatId, decisionId | null }`. `decisionId` is current metadata for scheduling checks, but a new decision for the **same owner** keeps that owner's deadline and token. This lets timeout AI finish exploration → rotation → control → discovery or other chained choices without returning a half-turn to the player. A decision for another player receives that player’s full duration.
3. An accepted command that leaves the same owner active **does not** extend the deadline. Revisions and decision IDs change normally; the scheduled job guards by timer token and current owner, not an obsolete match revision.
4. An owner transition creates a fresh random token and deadline. Old scheduled jobs are harmless no-ops. A player who later becomes active again gets a fresh turn because intervening owner transitions have changed the token.
5. At deadline, a durable job checks token, deadline, and authoritative owner. It runs Normal AI from that human seat’s filtered `PlayerView`, one legal command/decision per job. It continues while that expired owner still owns the turn or an outstanding choice, with a bounded step count. Seat controller remains `human`; no persistent controller conversion occurs.
6. The timer stays `timed-out` between each same-owner AI job, so the client and server both keep late human commands locked out until ownership changes. Failed/no-legal-command/step-limit jobs remain `failed` with an error exposed in `getRoom`/match room metadata. They never silently pass a player. A participant can call `retryRoomTimer`.

Normal AI seats continue using the existing `eclipseAiJobsV1` queue. Timer takeover jobs are separate, and use no hidden-state data.

## Test-first evidence

`src/__tests__/second_dawn_multiplayer_contracts.spec.ts` first failed on the absent multiplayer contract. It now covers deadline retention through ordinary same-owner revisions and chained decisions, retention of a timed-out owner lock, fresh owner/decision clocks, 30-second/48-hour bounds, room start readiness, faction assignment, invitation paths, and finished-game timer suppression.

`src/__tests__/second_dawn_rooms_convex.spec.ts` covers public-lobby privacy, duplicate-color rejection, readiness and host enforcement, match ownership/view metadata, host transfer, exact server-side timeout rejection, stale token safety, same-owner decision clock retention, timeout AI progression, and retention of the human controller. Focused contract and Convex tests pass (9 assertions groups / 7 tests) along with generated Convex typechecks and scoped lint.

`src/__tests__/second_dawn_multiplayer_completion.spec.ts` adds bounded end-to-end evidence. It starts all six alien factions as six human guests, verifies each guest receives only its matching owned view, then completes a separate two-human, zero-AI match by manually invoking only persisted timeout jobs. The test replaces only `Math.random` with a varying Mulberry32 stream seeded at `0x5eedc0de`; its fixed fake-clock run reached final scoring in exactly **197** timeout commands (below the explicit 3,000-command ceiling). Both controllers remained `human`, the room and timer reached `finished`, score totals were integers, and journal revisions were contiguous 1–197.

The timer is reconciled synchronously in the accepted-command mutation before AI work is scheduled. The recovery `syncRoomTimer` job remains for interrupted workflows, but it no longer creates an ownership/deadline gap after a normal command.

Every timeout-AI journal entry now appends the authoritative public action event `Normal AI completed this choice after the turn timer expired.` and increases its persisted receipt event count. History projection recognizes that exact public event only and prefixes the ordinary public action summary with `AI takeover · `; it does not infer takeover from command IDs and preserves private-event filtering.

## Risks and rollback

Lobby and timer storage is additive. Disabling the room routes leaves existing solo games, ownership rows, snapshots, journals, and AI jobs untouched. A timeout-job bug can be disabled by stopping scheduling; it cannot alter a seat’s persistent controller type.
