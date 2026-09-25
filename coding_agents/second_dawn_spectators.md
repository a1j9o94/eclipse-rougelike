# Public spectator mode

## Outcome
Anyone with a started room link can watch all players and inspect public sectors, science/research tracks, command centers, blueprints, history and final standings without occupying a seat.

## Acceptance criteria
- Non-players automatically enter spectator mode without registration; waiting rooms remain lobbies and seated players retain their normal board.
- Follow humans and AI by default. Manual inspection or camera interaction pauses automatic focus while data stays live; Resume following returns to current activity.
- Server responses contain only explicitly projected public state/history, honoring custom visibility rules. No private holdings, pending choices, internal state, or deck order.
- Spectators have no gameplay, room-management, timer retry, undo or AI-advance controls.
- Desktop/mobile and keyboard inspection work. Newcomers identify current actor and inspect science/sector details unaided; experts compare empires without focus stealing.

## Decision log
- Introduce PublicGameView, retain PlayerView ownership fields, and introduce a distinct SpectatorView; never invent an owned seat.
- Room-token queries supply public live state and bounded retained public history. Public inspector components accept public data; action planners remain player-only.
- Seat takeover, puzzles, chat and historical replay are out of scope.

## Tests (must fail first)
- Projection privacy under standard/custom rules, public scores, serialized hidden-value exclusion.
- Room spectator queries, invalid links, pagination/undo retention, unauthorized mutations.
- Automatic routing, waiting/finished rooms, authenticated seat recovery, no spectator guest creation.
- Public inspection, human/AI following, pause/resume, reconnect and responsive/keyboard behavior.

## Risks and rollback
Public component type extraction may affect seated-player rendering; run focused existing regressions. Additive queries require a backend publish before the frontend release. Preserve game rules/save schema. Revert UI/query additions if necessary; never delete saved game data.

## Validation and release
Pending. Run bounded suites, lint and build. Verify local browser flow, deploy existing backend, merge/push main and verify Git-triggered production deployment. Distinguish browser automation from human playtests.

## Follow-ups
Human newcomer/expert playtests after engineering verification.

## Implementation and validation — September 24
- Added public view/type extraction, anonymous room view/history endpoints, cached history reset after undo, spectator routing without guest creation, public board shell, read-only timer, and safe shared inspector reuse.
- Returning players can sign in from an anonymous room without enabling guest-only registration. Existing player Follow AI and mutation authorization remain unchanged.
- TDD: entry baseline had three expected failures; backend privacy/query tests and UI shell tests recorded red/green in subagent logs. Login regression had two expected component failures before repair.
- Main integration batch: 74 tests across 14 suites passed. Public/player inspection batch: 60 passed, one stale fixture expected settings focus despite the initial turn modal; explicitly dismissing that modal fixed the fixture. Follow-up 27 tests across four suites passed, including turn attention and player settings focus. Two pre-existing room reauthentication tests were updated to traverse the current Game menu → Open game room flow.
- Final `npm run lint` and `npm run build` passed. Build retains existing large-chunk/Browserslist notices.
- Actual local Convex + Vite browser verification: anonymous room entry creates no guest credential; public sectors/fleets/planets, command-center science tracks and blueprints inspect correctly; a real host pass updates the actor while the inspected empire remains open and following stays paused; Resume following restores the galaxy. Desktop 1440×900 and phone 390×844 screenshots reviewed, no horizontal overflow, no application console errors. Public room overview offers enabled Sign in and Watch game without player controls.
- Browser review caught and fixed inherited fixed-height board clipping, stale prior-actor camera focus, spectator “Your territory” label, and fresh-browser sign-in gating. Final/abandoned views and keyboard sector inspection are covered by component tests.
- Evidence: [desktop](visuals/spectators/desktop.png), [phone](visuals/spectators/mobile.png), [sector](visuals/spectators/mobile-sector.png), [science](visuals/spectators/mobile-science.png). These are engineering checks, not human playtest evidence.
- Backend published successfully to existing `dev:ideal-nightingale-55` using account authentication. Both hosted spectator queries return null for an invalid link. The CLI's explicit --env-file mode excludes account authentication; using verified default project selectors resolved that tooling issue. Deployment configuration remains unchanged.

## Release status
Backend functions published at 19:59 local, September 24. Frontend main merge/push and hosted verification follow.
