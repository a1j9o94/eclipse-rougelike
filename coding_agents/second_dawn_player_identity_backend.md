# Recoverable player identity backend — 2026-09-08

Outcome: players can name their existing identity and resume its solo matches and multiplayer seats on another device using a PIN or a recovery code.

Acceptance criteria:

- Registration attaches to the existing guest ID; existing room and match ownership remains valid.
- Name normalization and transaction checks prevent duplicate names or duplicate profiles for one owner.
- A player name alone never grants seat access. Optional PINs contain 6–12 digits. Every registered player receives a random recovery code.
- Each successful login issues an independent, server-generated credential. All devices resolve to the same owner.
- Public profile and room/match projections expose display names without PIN hashes, recovery hashes, or owner IDs.
- Failed guesses consume an atomic reservation before expensive verification. Five unsuccessful attempts lock that name for 15 minutes; successful authentication clears the limit.
- A still-authorized device can replace a lost recovery code, including when registration succeeds but its network response is lost.

## Decisions and sources

Existing `eclipseGuestsV1` IDs remain canonical. New `eclipsePlayersV1`, `eclipsePlayerSessionsV1`, and `eclipsePlayerLoginLimitsV1` tables add recovery without migrating saves. Shared `convex/eclipseIdentity.ts` resolves both original and recovered credentials; match, room, and guest endpoints use it.

`eclipsePlayers.registerPlayer`, `loginPlayer`, and `rotateRecoveryCode` run as Node actions. Native Web Crypto derives PIN hashes using PBKDF2-HMAC-SHA256, a random 128-bit salt, and 600,000 iterations. This follows the current [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Node actions avoid relying on partial crypto support in the Convex default runtime; see [Convex actions](https://docs.convex.dev/functions/actions).

Recovery codes contain 128 random bits and are stored only as a domain-separated SHA-256 digest. Each device credential contains 256 random bits and is also hash-only. Hash comparisons use Node's constant-time comparison for equal-length values. Raw codes are returned once, without logging. Registration and replacement are authorized by an existing valid browser credential.

`eclipsePlayerStore.getPlayerProfile` returns only `{username, pinEnabled}`. Match views add `playerNames` keyed by game seat ID, and room seats add `username`. Identity hashes and canonical guest IDs remain outside these projections.

Registration checks occur once before slow PIN hashing and again in the atomic write transaction, including both unique-name and unique-owner indexed reads. Login rate reservations commit before verification, so a failed action cannot roll back its failed guess. Successful login clears the limit. Original guest creation and recovered session creation both check the two credential namespaces for collisions.

## Verification

Tests were written and run failing before implementation:

- Existing solo ownership/private view survives registration and both PIN/recovery login.
- No-PIN profiles require a recovery secret; malformed credentials and username-only claims fail.
- Concurrent wrong guesses enforce the five-attempt limit, with cooldown recovery.
- Racing registrations preserve unique names and one profile per owner.
- Name/PIN validation and guest authorization prevent malformed registration.
- Multiplayer membership resumes with an independent credential; other room guests see only the public name.
- Original guest insertion cannot shadow an existing recovered credential hash.
- Recovery code replacement revokes the prior code while preserving device sessions; outsiders cannot rotate.
- Successful repeated logins do not consume the failed-guess budget.
- Independent review identified a login/rotation race. The final session insertion compares the recovery hash that was verified, rejecting a login whose code rotated while verification was in flight; PIN logins remain valid.

Red logs: `coding_agents/logs/second_dawn_player_identity_red.out`, `second_dawn_player_identity_names_red.out`, `second_dawn_identity_collision_red.out`, and `second_dawn_identity_recovery_red.out`.

Green adapter batch and final lint/build results are recorded in `coding_agents/logs/second_dawn_player_identity_green.out`, `second_dawn_identity_lint.out`, `second_dawn_identity_build.out`, and `second_dawn_identity_full_lint.out`.

## Risks and rollback

This is additive storage. Rollback can keep existing guest credentials and solo saves working; recovered sessions require the shared resolver to remain deployed. A lost PIN and recovery code can be repaired only from an already-authorized device. There is no email recovery or automatic merger of separate guest identities. Username-scoped limits can temporarily lock an account if someone deliberately submits five wrong guesses; existing device sessions are unaffected.

## Follow-ups

Supervisor owns deployed browser verification, UI delivery of recovery codes, and public-name rendering. No backend deployment was performed by this sub-agent.
