# Independent game options: backend boundary

Outcome: players can choose game length and individual variant rules in solo or shared games, and reconnect to exactly the settings they chose.

Acceptance criteria: typed optional overrides survive room creation, setting changes, game creation, snapshots, and saved-game summaries; invalid round counts and incompatible Rift Cannons fail server validation; Terran bans use the faction option independently of the preset; any room settings change resets readiness. Historical settings and snapshots without overrides keep their prior behavior.

Decision log:
- Added an exact optional `ruleOptions` object to solo/room arguments and room/match schema, containing an integer round count from 1–20 and the eight independent Boolean options.
- Added optional `riftCannons` to room settings and solo creation. Missing retains the historical preset default, constrained by the effective combat/technology rules. Explicit incompatible enabling is rejected.
- All faction bans and AI faction choices use `factionRulesMode`; changing faction rules off clears bans. Profile changes clear incompatible bans and discarded seats' bans.
- Room settings replace omitted overrides so reverting a preset cannot leave an old round count behind. Existing gameplay continues to read authoritative snapshot settings.
- Custom portal flags are passed through. Shared setup preserves historical preset-only portal behavior and honors explicit portals once an overrides object exists.

Tests: `second_dawn_custom_rules_convex.spec.ts` initially produced five expected failures covering rejected new arguments, independent portal validation, and effective faction readiness. All eight final tests pass, including invalid rounds, solo and room snapshot persistence, summary round limits, ban validation, clearing overrides/readiness, and historical defaults. The six focused existing suites (`second_dawn_less_random_convex`, `second_dawn_terran_bans`, `second_dawn_multiplayer_contracts`, `second_dawn_rooms_convex`, `second_dawn_expansion_rooms`, `second_dawn_matches_convex`) pass all 29 tests. Focused ESLint and `tsc -p tsconfig.eclipse.json` pass. Supervisor runs full lint/build gates before release.

Release preparation: read-only inspection confirms `.env.local` selects `dev:ideal-nightingale-55` and `https://ideal-nightingale-55.convex.cloud`, with no deploy key and no inherited cloud/self-hosted override. After gates, the supervisor can publish the backward-compatible backend using:

```sh
CONVEX_DEPLOYMENT=dev:ideal-nightingale-55 npx convex dev --once --typecheck enable --tail-logs disable
```

This is the existing live frontend's development Convex target; the Vercel main-only Git build does not publish backend functions. Deploy the compatible backend before the frontend begins sending new argument fields. No deployment was performed by this sub-agent.

Risks and rollback: the frontend must not lead the validator deployment. Reverting the frontend is safe with these additive backend fields retained; retain backend support for newly saved custom games rather than removing their schema immediately.

Result & next steps: persistence and shared lobby boundary completed; parent owns integrated visual checks, final lint/build, backend publication, Git main merge/push, and production verification. No further backend code work remains identified.
