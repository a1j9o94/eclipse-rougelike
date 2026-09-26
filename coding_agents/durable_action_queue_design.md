# Durable action queue

## Player outcome

A player can plan an exact sequence of actions, review it, and authorize the server to execute each step as soon as its legal window arrives, even after closing the browser. The game displays a persistent reason whenever the plan pauses. The queue never substitutes or silently skips an action.

## Acceptance criteria

- One private queue per match seat supports save/reorder/edit, start, pause, and resume. A saved draft cannot execute until started. Editing pauses execution.
- The queue supports every nondecision gameplay command. Pending decisions always require the owner; the queue pauses until they review and resume. Pass can be followed by next-round actions.
- A queued step is checked against the authoritative state immediately before commit. Research can unlock a later Upgrade; a later Move can name a ship built by an earlier Build. Planned sector references use stable coordinates, and hidden draws are marked uncertain until resolved.
- Steps use the same rules processor, revision sequence, journal, and room timer handling as manual commands. A changed main action finishes the prior action explicitly. One worker executes at most one command per scheduled run, with idempotent retries and a bounded follow-up schedule.
- Invalid or unaffordable commands preserve the remaining queue and display the engine reason. A manual command, choice, undo request, resignation, or queue edit stops automatic progress until explicit review; finished games cannot execute queued commands.
- Automatic `finish-upkeep` must preserve the existing unused-colony-ship review before payment.
- Queue status and pause reasons appear on the board and saved-game list without revealing a seat's plan to other players or spectators. Alerts are in-app, not browser push.

## Decision Log

The owner selected server execution while offline, all action families, future planned dependencies and future object references, pause-and-alert on failure, pause after manual play or a choice, early completion when switching main action, immediate execution, and cross-round continuation after Pass. Queued commands are exact requests, not strategic goals the server may reinterpret.

## Delivery and checks

1. Shared typed queue steps, future-reference resolution, and conservative projection tests.
2. Private Convex queue state, mutations, scheduler and command-journal integration, with concurrency, choice, timeout, rollback, and privacy tests.
3. Planner entrypoints, queue editor, status/alerts, saved-game summary, and desktop/mobile checks.
4. Relevant bounded tests, lint, build, ledger update, production release and hosted verification. Human newcomer and experienced-player playtests remain follow-ups.

## Risks & rollback

An automatic command can spend resources or change turn timing while the owner is away. Explicit start, exact commands, live validation, and conservative pauses mitigate that risk. If release verification finds unsafe execution, disable scheduling while preserving queued drafts for review.

## Result & next steps

The shared planner, private Convex queue worker, and in-game planner are implemented. A local game confirmed that a queued Research command executed through the server, the technology appeared, and the step changed to Done. Desktop and 390px browser checks found no page errors; the mobile check exposed horizontal overflow in the queue editor, which was fixed by stacking its controls. Focused tests, lint, and build passed. Human newcomer and expert playtests remain follow-ups.

## Release

The established `dev:ideal-nightingale-55` Convex deployment accepted the new queue indexes and functions through `npx convex dev --once`; the CLI reported functions ready. Commit `7fa5d9b` reached `main`, and Vercel production deployment `dpl_FufWq6L47TtFSpiJns2DBMcDoAdT` became Ready. In a new guest game on the public alias, a queued Pass step saved and executed to Done. The 390px queue dialog had no horizontal overflow or browser errors. Human newcomer and expert playtests remain follow-ups.
