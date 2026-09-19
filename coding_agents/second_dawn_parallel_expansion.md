# Sound and faction expansion — execution plan

## Outcome and ownership
Deliver optional tactile audio/ambient music and four complete expanded factions, with a history-scroll fix released first. User approved the two work orders September 19, 2026. Sound worktree: feature/sound-feedback. Faction worktree: feature/faction-expansion; engine and frontend agents own separate directories. Supervisor owns history, session/Convex compatibility, integration, review and main-only releases.

## Locked decisions
- New effects and music OFF by default, independent of dice and animations; initial volumes 35%/15%. Existing dice preferences preserved. Original bounded procedural ambient audio, no streaming dependency.
- Expanded default only for new games/rooms; Base only option. Missing profile in existing saves/rooms resolves to base. Existing factions retain base trade rates.
- Rho Indi, Magellan, Midas, Ragnarok use archived Drive faction rules/current amendments in an eight-round base environment with private reputation and existing draws/market. Do not import the full ten-round house-rule variant.
- Persist seat piece color independent of species. Preserve old snapshots through fallback. Version/profile validation applies equally to human, AI, retries, room starts and resumed saves.
- Each new faction requires complete setup, rules, visible ability interactions, fair AI and scoring; selectable placeholders are not completion.

## Acceptance and fail-first checks
History: reproduce unbounded log; bounded desktop/mobile scrolling, keyboard/touch, reading anchor on new events, older pagination. Audio: cue timing/deduplication, authoritative acceptance, no reconnect/history backlog, hidden/skip/unmount cleanup, opt-in persistence, independent channels, bounded music and voice count; browser/listening artifacts. Factions: source fixtures and finite supplies, trades/funding, reactions, mixed action and paid bonus lifecycle, private discoveries, old save compatibility, room color/profile validation, duplicate/stale commands, full seeded matches at 2–6 players and human workflows desktop/mobile. All work requires relevant one-worker tests, lint, TypeScript and production build. Supervisor reviews combined React/browser behavior.

## Risks and rollback
Separate source-derived faction abilities from global house rules. Shared board edits are integrated by supervisor. History/audio can revert independently. New match profile versions must remain supported once public matches exist; disabling new match creation is safer than removing handlers. Convex uses existing development deployment; Vercel deploys Git pushes to main only.
