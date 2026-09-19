# Strategic AI runtime and difficulty — September 18, 2026

## Outcome and acceptance
Players can choose visually between Normal, Hard and Expert, see when opponents are thinking, and receive stronger server-side decisions without blocking the browser. Every computed move still passes the authoritative command processor. Existing solo games wait indefinitely for humans.

Acceptance: at most one leased worker per current decision; private seat-filtered search input; atomic revision/lease/actor/timer validation; duplicated/stale results harmless; interrupted work visible and retryable; cumulative action budget survives pending choices, including another owner; same rules and no AI bonuses; mobile/desktop difficulty choices legible.

## Decisions
- `aiConfig.ts`: strategic-v1, Normal fast policy (500ms allowance, no tree search), Hard 3s/180 nodes/4 depth, Expert 30s/600 nodes/5 depth. Node caps are ceilings, not promises of completed depth. Parent search may tune limits with benchmark evidence.
- Pin optional difficulty/version on match rows; absent old fields default to current Normal. Rooms store difficulty and transfer it at start. A future incompatible pinned version fails visibly instead of silently changing policy.
- Keep `runAi` as a short internal mutation dispatcher for scheduled-call compatibility. It claims a random lease, schedules `thinkAi` internal action, and schedules an expiry watchdog. Expensive search runs exclusively in the action.
- `getAiWork` provides PlayerView, independent stable simulation seed, remaining budget and difficulty. It never returns the authoritative snapshot, hidden decks or engine RNG.
- `commitAiWork` checks revision, lease, expiry, controller/timeout ownership and rules legality atomically. It stores only accepted commands and schedules the next paced choice.
- Remaining milliseconds follow the originating action owner, including temporary other-seat decisions. Finish resets the next action budget. Forced/pending decisions use the parent's fast policy. Interrupted work consumes the remaining allowance, so retry does not launch a fresh expensive search. Public retry cannot restart an active lease.
- Keep Normal AI for timeout takeover, preserving the original deadline/token, human controller and 32-command cap. Shared worker still records timeout events and retains 1.2s presentation pacing. Retire its lease at human/final handoff so a stale watchdog cannot report a failure later.
- Persist last compute milliseconds, nodes, completed depth and cutoff internally for hosted cost/latency review; these are not hidden gameplay information exposed to opponents.
- Difficulty cards have selected borders, strength bars, timing copy and keyboard focus. Expert explains accumulated opponent wait. AI activity shows “Thinking…” / “Comparing plans…” only during actual computation. Roster labels use configured difficulty.

## Tests and evidence
- TDD: new worker tests first failed on missing difficulty/lease schema in `coding_agents/logs/ai_worker_red.out`.
- Worker coverage: exclusive claims; filtered work; stale leases; duplicate commits; cumulative activation budget; active retry deduplication; interrupted lease/zero-budget recovery; room difficulty pinning; no solo timer; preservation through another player's pending decision.
- Existing match identity/failure/recovery, pacing, timer, room, completion and multiplayer tests exercise the new dispatcher/action pipeline. Test helper drains only already-dispatched zero-delay stages, never advances future paced turns. Removed an old policy-specific exact197-command assertion in favor of completing under3000 commands while keeping full journal/scoring/controller assertions.
- Two-human full timeout match completes through scoring with the final AI job retired. Relevant final batch saved in `coding_agents/logs/ai_runtime_final.out`.
- Changed runtime/UI/test files lint clean. Frontend TypeScript and Convex TypeScript passed during implementation; parent runs final combined lint/build gates.
- Local real Chromium screenshots: `second_dawn_ai_difficulty_review/expert-1440.png`, `expert-390.png`; no horizontal overflow or page errors. Reviewed actual images and corrected paragraph spacing. This is a fixture component review, not a human playtest or hosted performance benchmark.

## Risks, rollback, follow-ups
Deploy Convex before the frontend so new validators, schema and internal workers exist before difficulty controls are used. Fields are optional and no existing snapshots or rules are migrated. Rollback requires retaining worker endpoints until already-scheduled jobs finish, or rescheduling them using the prior controller; do not remove scheduled endpoints during active work.

Hosted throughput, p95 wait, parallel match cost and strength evidence belong to the combined strategic AI release assessment. Local node limits and tests do not establish a universal wall-clock guarantee on every host. Display-only delay remains separate from search time.

## Read-only deployment inspection
Current shell has no Convex target/key overrides; `.env.local` selects `dev:ideal-nightingale-55` and the matching frontend URL, with no deploy key or self-hosted selector. Existing Convex CLI login is present. After final gates, the explicit development push command is `CONVEX_DEPLOYMENT=dev:ideal-nightingale-55 npx convex dev --once --typecheck enable --tail-logs disable`. This inspection did not deploy. Current Vercel main-only frontend builds do not publish Convex functions.

## Independent recovery and concurrency review
Adversarial tests first reproduced three issues: generic AI retry did not recover timed-out human workers; another player's legal off-turn command invalidated a takeover lease without scheduling its replacement; arbitrary public command IDs could occupy a future server command ID. Fixed all three: both retry controls share timeout recovery, accepted off-turn changes requeue takeover with the original token/deadline and no renewed search allowance, and new public `ai:` / `timeout:` IDs are reserved. Existing accepted legacy receipts remain idempotent. Worker commit reads the journal index and refuses collisions instead of inserting duplicates.

The follow-up review found that off-turn activity after an AI failure could restart the expired human clock. Same-owner failed timers now retain their deadline/token; the AI failure remains visible until explicit recovery. Independent six-scenario tests pass, including expired leases and replaced timeout tokens. A component test also showed the general retry button was disabled by the human command lock; recovery now remains clickable while connected. Takeover thinking is labeled explicitly instead of saying “Your turn.”

Added `getAiDiagnostics`, an internal-only projection for a single requested match: revision, configured difficulty/version, job status/attempts/error, remaining budget, last compute milliseconds, nodes/depth and cutoff. No snapshot, credentials, deck or private tiles. Compute deadlines and telemetry use monotonic `performance.now()`; persisted lease deadlines continue to use `Date.now()`.

## Hosted planning telemetry retention
A fast follow-up command legitimately replaces per-command telemetry, which made the preceding strategic search difficult to measure after deployment. Added optional `lastPlanComputeMs`, `lastPlanNodes`, `lastPlanDepth` and `lastPlanCutoff` on the job and internal diagnostics. They update only when the accepted command reports positive search nodes; zero-node choices retain the preceding plan measurement. A failing-first regression commits a searched exploration command followed by a zero-node placement decision and verifies both current-command and retained-plan measurements. Search policy and budgets are unchanged.
