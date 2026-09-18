# Independent player access review

Reviewer: solo_rooms agent. Source review covers PlayerAccessPanel, ConnectedGame, guestStorage/playerSession, eclipsePlayers, eclipsePlayerStore, eclipseIdentity and room projections. Browser review follows the development backend push.

Findings sent to implementation owners:

1. **Original anonymous player can be lost after multiple switches.** The initial switch helper stores only one previous credential. Guest A → registered B → registered C overwrites the only pointer to A. Preserve the original browser guest independently or retain a deduplicated identity history. A two-switch-only test does not cover this loss.
2. **Same-owner sign-in can strand the room screen until reload.** The room-opening effect initially depended only on matchId and viewerSlot, while switchPlayer clears local matchId. Reauthentication as the same seat preserves those dependencies. Include credential in reconciliation or restore the match explicitly.
3. **Recovery rotation and in-flight login.** Login reads a recovery hash before expensive validation; final session insertion initially checks only playerId. Rotating the code between those steps can still allow an in-flight old-code login. Check the verified hash/version at the final mutation if old-code revocation must be immediate. Existing device credentials intentionally remain valid.
4. **Hidden invalid solo timer.** Clearing the custom multiplayer timer and then reducing the room to one human hides that invalid field, but shared settings validation still disables Save. Normalize the unused timer during that transition, or otherwise ensure the solo form can recover without an invisible requirement.

Positive checks:
- Registration attaches to the existing canonical guest instead of migrating or discarding saved ownership.
- Recovered credentials resolve to that same guest for legacy solo matches, rooms and private match views.
- Optional PIN omission still requires the randomly generated recovery secret; usernames and room links alone grant no seat access.
- Public name projection is explicit. PIN/recovery hashes are internal; new credentials are returned only from actions and stored server-side as hashes.
- Username uniqueness and guess limits are enforced in mutations, including concurrent requests.
- Rotation provides a recovery path after a successful signup response is lost, provided the original browser credential remains available.

Status: implementation owners notified. The supervisor owns fixes and end-to-end verification; this document records findings rather than claiming a formal security audit or human usability study.

Follow-up: the identity agent fixed item 3 by passing the verified recovery hash to the final session mutation, with a failing-first race regression. Independent identity, credential-switch and legacy guest test batch passes (19 tests); log: `coding_agents/logs/second_dawn_identity_independent_review.out`.

Implementation follow-up: items 1, 2 and 4 are fixed with failing-first regressions. The credential helper retains the first browser owner separately from the previous login; the visible restore action prioritizes that original owner. Room restoration reacts to credential changes even if the seat and match IDs are unchanged. Switching an invalid-timer draft to solo supplies the minimum compatible timer value while keeping it unused/hidden. The focused session, room settings and ConnectedGame regression batch passes all 9 tests; scoped lint passes. Logs: `second_dawn_identity_ui_review_red.out`, `second_dawn_identity_ui_review_green.out`, `second_dawn_identity_ui_review_lint.out`.

Actual rendered browser review: `tools/second-dawn-solo-room-review.mjs` drove the local frontend against the deployed development backend. It changed an invalid timer into solo settings, created a one-human/one-AI room, readied the host, and started the game. Nine images under `coding_agents/second_dawn_solo_room_review/` cover settings, room and live board at 1366×768, 1440×900 and 1920×1080. All images were opened and inspected. The settings confirmation and no-timer notice remain readable; the lobby's Ready/Start footer stays accessible; faction details below the fold use normal scrolling. The live board retains visible resources, action controls and save status, and has no human timer. The initial camera shows the player's territory with Fit available for the rest of the galaxy. No horizontal overflow or browser errors were observed. These are agent-operated checks, not independent human playtest evidence.
