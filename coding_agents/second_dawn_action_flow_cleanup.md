# Action flow, mobile fitting, and legacy cleanup — September 19, 2026

## Outcome
Players finish actions without bookkeeping clicks, fit ships in one continuous mobile workspace, and use a maintained Second Dawn-only application.

## Acceptance criteria
- All six actions automatically hand off once capacity is exhausted and queued required choices have resolved; unused capacity can still be ended explicitly. Human/AI follow the same engine. No invented finish prompt, automatic resource selection or lost queued reward/control decision.
- Last-move diplomacy consequences remain visible before commitment. Existing saves, command receipts and multiplayer timers continue to work.
- On mobile the selected blueprint remains usable. Tapping a slot opens a scrollable replacement-part picker with the current component, effects and availability. Selecting changes only the draft; one final Apply commits. Class switching, stored parts, energy rules, keyboard focus and small-screen fit remain supported.
- Remove the old roguelike application, executable routes, unused assets/tests/tools/dependencies. Preserve full-game dependencies, Second Dawn previews, AI benchmark baselines and deployed schema/data compatibility.
- Full lint clean, production build and relevant memory-bounded tests pass. Review actual mobile/desktop rendering and task flows; distinguish engineering checks from human playtesting.

## Tests first
- Exhausted single/batched actions hand off; partial actions stay; saved follow-on decisions defer handoff; betrayal timing and atomic failures (engine agent).
- Slot opens chooser; choosing updates draft without submission; cancellation/focus/class/Ancient-part semantics (upgrade agent).
- Mobile action entry leaves a visible blueprint; accepted final activation returns to galaxy once without overriding later inspection (supervisor).
- Launcher has no legacy entry and legacy route cannot load removed gameplay; retained entry points compile (cleanup agent).

## Decisions and risks
User explicitly requests automatic exhaustion handoff and complete legacy gameplay removal, superseding earlier preserve-legacy / always-Done workflow guidance. Optional free colonization and diplomacy remain available before the last activation, on later turns and in their existing legal windows; do not add a blanket post-action acknowledgment. Already queued required choices must be retained. Removal does not require deleting historical deployed rows or breaking schema validation. Roll back individual commits if needed; retain backend compatibility and never force-push history.

## Work and release
Feature branch `feature/action-flow-cleanup`, based on current main after fetch/pull. Parallel ownership: engine completion, upgrade picker, legacy cleanup; supervisor owns board integration and release evidence. Main-only Vercel Git deployment; compatible backend deployed first if needed. Test/build evidence will be appended after implementation. Human device playtest not yet performed.

### Additional user request — visual fleet intelligence
During implementation the user requested the public fleet inspection screen use the visual blueprint/loadout treatment. Add readable installed component tiles and ship statistics, preserving per-ship damage and public-only opponent information. Keep comparison and Return to plan behavior. Focused tests and desktop/mobile rendered review are required; cleanup agent owns this next bounded slice.

### First-pass affordance
User requested an explicit bonus on Pass and agreed to the verified +2 amount. [Publisher-verified Passing rule](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/dKyuHOf_Th2ZLtAE4GZNGg/passing) awards two Money and next round's start tile. Button now reads `Pass +2 money` only while unclaimed, otherwise `Pass`; desktop/mobile share the label and the bonus constant is shared with both turn processors. No balance change. Initial label regression failed, then the 28-test quick-turn/mobile/handoff/spatial/turn batch passed.

### Discoveries, decision minimization, and inspector space
User added that pending discovery must remain easy to resume after inspecting opponents, and sector details should occupy less of the board by default. Add named persistent resume controls and minimizable choice windows preserving drafts; collapse the desktop inspector when unnecessary and expose an obvious toggle/selection path. Engine agent now owns this Board/decision presentation slice after completing authoritative exhaustion tests.

### In-card research confirmation
User added that selecting a technology must not require scrolling to a separate confirmation. Move research confirmation, track/funding choices and relevant warnings into the selected market card, remove scroll-to-top, retain explicit purchase and saved drafts. Upgrade agent owns this additional slice.

## Implementation and review
- Authoritative action exhaustion advances after required choices; all six action types, reactions, nested decisions and betrayal have regression coverage.
- Ship slots open a visual replacement picker with draft-only changes and final Apply. Public fleet inspection shows effective loadouts, class counts and per-ship damage.
- Pending choices stay mounted when minimized, with named resume controls across inspection screens. Sector details collapse to release board space. Automatic AI presentation remains visible when following; manual close and inspection persist.
- Research purchases and conversion warnings stay beside the selected card. Desktop and mobile Pass show the available +2 money bonus.
- Legacy runtime, routes, unused dependencies and tests removed. Deployed schema and stored data are unchanged.
- The reported center-sector connection issue was retracted by the user after checking neighboring tile orientation; no geometry change was made.

### Validation evidence
- Reviewed deterministic Chromium/WebKit desktop and touch-emulated screenshots for upgrading, fleet intelligence, research, choice minimization and AI following; detailed findings and artifacts are linked from the feature documents in this directory. These are engineering browser reviews, not physical-device or independent human playtests.
- Twelve integrated browser scenarios (Chromium/WebKit, desktop/mobile, upgrade/research/move) each committed exactly one command and handed off after the final activation, with no page errors. Research selection caused no scroll jump; discovery drafts survived opponent inspection and returning.
- Full lint: zero errors/warnings. TypeScript and production build passed. Existing Vite chunk-size and Browserslist advisories remain build advisories, not lint debt.
- Compatible backend deployed to development `ideal-nightingale-55`; hosted browser checks created and resumed Normal/Hard two-seat and Expert six-seat matches, then observed accepted AI commands without page/job errors. No user saves were modified.
- Final combined test and Git/Vercel release results are recorded below after completion.

### Final gates — September 19
Final bounded combined run: **144 Second Dawn files, 782 tests passed** (136.44 seconds, one worker, 4 GB heap cap), plus the retained ErrorBoundary test passed separately. This includes full seeded games, all factions, conservation/replay, multiplayer/worker contracts and the new UI flows. Initial integration caught AI presentation hidden by the collapsed inspector and a stale research-test DOM reference; both were resolved before this clean run. Full lint and production build passed after the final UI fix. Staged whitespace checks passed. Release proceeds by merging the feature into `main`; Vercel Git integration is configured to deploy `main` only. Backend is already compatible and deployed to the requested development environment. Deployment SHA/status and live smoke results are captured in `coding_agents/logs/action_flow_release_result.json` after the push.
