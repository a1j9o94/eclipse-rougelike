# Off-turn next-action queue — October 9, 2026

Players plan with the existing action screens while another seat is acting. Confirmation states “Will execute on your turn” and saves one private, exact command. A later confirmation replaces that command; Cancel removes it. The authoritative server runs it once at the beginning of the player's action turn, without depending on an open browser. Follow-up exploration, diplomacy, discovery and combat decisions remain interactive. Intervening changes are checked by the normal engine; invalid commands preserve the player's turn and display a failure without spending resources or selecting another action.

Live turn ownership, opponent decisions and AI activity remain accurate. Only the viewer's already-filtered public view is projected for draft legality and previews. Matching queue receipts clear submitted choices while preserving edits made during a pending response. Request IDs and execution acknowledgment state are scoped by match, player and credential. An arriving turn dismisses unfinished queue confirmation and retains the ordinary action draft.

Backend intent and retry receipts are private ownership data. Normal and timeout handoffs invoke the same atomic execution path. Shared undo, resignation, elimination and round expiry invalidate old intent. An explicitly queued reaction pauses auto-pass for the round while retaining the user's enabled preference.

## Validation

The combined gate passed 93 tests in 12 bounded suites covering queue persistence and execution, desktop/mobile planning, drafts, research/build, auto-pass, rooms, rollback, session retry and navigation. The final turn-arrival regression also confirms that returning off-turn does not reopen an old confirmation. ESLint, Convex codegen/typecheck, full npm run build, and git diff --check pass. Independent read-only review checked server privacy, exact-command validation, atomic/idempotent execution and session isolation.

The deterministic browser script is tools/second-dawn-queued-action-review.mjs. It could not launch because this workspace has no Playwright Chromium executable. No live browser or human-playtest success is claimed.

## Release status

Prepared on feature/off-turn-queued-actions. Backend publication must precede main/frontend release under DEPLOYMENT.md. The established target remains dev:ideal-nightingale-55 at https://ideal-nightingale-55.convex.cloud. Convex CLI reported no login and could not prompt in the non-interactive terminal. Vercel project inspection returned 403 for obleton-adrian. Do not merge to main or call the feature live until backend publication is verified.

After authentication, publish with the DEPLOYMENT.md command, merge the tested PR to main, verify the existing Git-triggered Vercel status for that commit, and smoke-test the canonical game URL. No infrastructure, audience, backend target, or game balance change is required.
