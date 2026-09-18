# Recoverable players and solo rooms

## Outcome
An existing player can keep their current solo or multiplayer seats, add a persistent username, and resume from another browser with a PIN or private recovery code. Solo rooms wait indefinitely for their human player.

## Acceptance
- Keep existing guest credentials, match ownership, private views, and saved decisions valid.
- Unique persistent usernames identify players publicly. Optional 6–12 digit PIN or a high-entropy private recovery code authenticates cross-device access; usernames and room URLs alone never claim seats.
- Store only secret hashes and fresh server-issued session hashes. Rate-limit login attempts and use a slow salted PIN hash.
- Registration attaches to existing browser-owned games. Signing in on another device resolves the same owner and creates an independent session.
- Save a prior browser credential when switching identities; do not silently merge unrelated guests or orphan their games.
- Rooms allow one human against 1–5 Normal AI opponents. Solo has no human clock or timeout takeover; multiplayer retains its configured timer.
- Display player names in lobby and game roster. Provide profile/sign-in access from both home and room pages.
- Investigate the deployed connection report; replace indefinite unexplained connecting state with honest offline/retry status that does not delete identity.

## Test-first work
Account normalization/uniqueness, registration ownership retention, PIN/recovery verification, throttling, private profile filtering, multiple sessions, UI registration/recovery acknowledgement and sign-in, solo timer suppression, AI progression back to a waiting human, multiplayer timer preservation, interrupted browser session recovery.

## Deployment and review
Use feature/second-dawn-full-game. Preserve the dirty working tree and legacy data. Deploy backend only to ideal-nightingale-55, then Vercel. Run bounded tests, changed-code lint, TypeScript/build, and separate-browser live resume checks. Capture profile/solo setup with no secrets visible. Record inherited lint debt separately.

## Decisions
- User explicitly chose **Wait for me in solo**.
- Profile registration preserves canonical existing guest ownership. Cross-device sessions resolve that owner; game snapshots need no migration.
- No username-only recovery; PIN is optional because the private recovery code is always available.
- Live fresh-browser room creation currently succeeds; exact reported connection failure is not reproduced. Test blocked/offline connection behavior and report that limitation honestly.
