# Eclipse maintainability and gameplay preservation

This plan covers five accepted maintenance changes to Eclipse: native dialogs, responsive layout and CSS, board responsibilities, verification tooling, and development conventions. The player-facing contract is preservation of gameplay, available information, action sequences, drafts, camera behavior, and usable layouts.

Implementation proceeds in small independently reversible changes. A slice is complete only when automated checks and independent adversarial playthroughs agree that the player experience has been preserved. Screenshots must be opened and inspected; generating them is not a visual review.

Planning baseline: [repository commit cb6c932](https://github.com/a1j9o94/eclipse-rougelike/commit/cb6c932cc11ad30487a23862256f3aef5c2d650f), checked on November 11, 2026. Refresh this baseline before implementation if main changes. This is an implementation plan; runtime checks and refactors remain to be performed.

# Player experience contract

| Area | Required invariant |
| --- | --- |
| Rules and outcomes | Same legal actions, costs, rewards, damage, movement, pinning, exploration constraints, faction effects, upkeep, scores, and turn ownership for the same state and command sequence. |
| Action flow | Same choose, preview, confirm, execute sequence and number of required actions. Preserve pieces-first building, consecutive movement, inline research confirmation, and off-turn planning. |
| Drafts | Opening another workspace, inspecting another player, resizing, refreshing, or reconnecting preserves the correct draft and selections. Closing a panel does not discard a draft. |
| Queued actions | A queued acknowledgement is distinct from an executed command. Invalidated queues show the existing failure and recovery behavior. |
| Camera | Fixed fit stays fixed through exploration, AI turns, decisions, inspection, and resizing. Manual zoom and selection restore when returning from inspection. |
| Attention | Decisions, AI activity, combat, and recaps do not unexpectedly steal a player from inspection or an unfinished activity. Preserve existing deliberate turn-completion navigation. |
| Information | Players can read resources, turn state, action costs, previews, warnings, available choices, and results wherever they currently can. No loss of private/public information boundaries. |
| Interaction | Controls remain visible or discoverable, reachable by scrolling, and actionable with supported mouse, keyboard, and touch input. Focus returns to the appropriate control. |
| Presentation | Preserve theme, assets, useful map area, information hierarchy, motion preferences, dice skip, and sound behavior. No unsolicited redesign or extra clicks. |
| Compatibility | Existing saved games, draft storage keys, player identity, multiplayer sessions, and backend contracts continue to work. |

Existing defects discovered during baselining are recorded separately. A failing baseline is not permission to weaken tests, and a refactor must not silently bundle a gameplay or visual redesign. Fix baseline blockers in isolated changes and recapture only the affected approved baseline.

Slice 0 turns this contract into an executable scenario manifest. For every checkpoint, list essential information and controls, stable semantic locators, expected region, immediately visible versus scroll-reachable status, expected enabled state, and expected action count. Include explicit assertions that the intended fixture actually loaded.

# Delivery order

| Slice | Scope | Gate before advancing |
| --- | --- | --- |
| 0 | Freeze behavior, inventory tests, capture baseline evidence | Baseline scenarios reproducible; missing coverage and pre-existing failures classified |
| 1 | Make verification commands truthful and browser evidence reproducible | Same or greater test discovery; deliberate negative controls prove gates fail |
| 2 | Native dialog wrapper, then consumers in small groups | Modal, non-modal, keyboard, touch, scroll, and overlay checks pass |
| 3 | Extract board markup into cohesive components without layout changes | Equivalent commands, lifecycle, screenshots, and click paths |
| 4 | Extract navigation, submission, map, and encounter coordination incrementally | Transition and recovery tests pass; independent interaction challenges pass |
| 5 | Simplify mobile layout and consolidate styles component by component | Full responsive visual and interaction matrix passes |
| 6 | Finish formatting, browser support policy, and agent instructions | Commands and ownership documentation match implementation |
| 7 | Integrated full-game review and release | All required evidence complete; no unresolved release blockers |

The five workstreams below map to these slices. Establish formatting rules early; format touched modules in separate mechanical commits before extracting them. Do not combine DOM extraction, state redesign, and CSS changes in one commit. Keep implementation serial where it shares board state or global styles; use parallel agents primarily for independent review.

Per-slice validation runs every affected case plus a fixed cross-project smoke set covering explore, build, move, research, a modal, a pending decision, queue acknowledgement, and draft/camera restoration. Record dependency-based selection in the manifest; shared shell or global CSS changes trigger the full relevant screen matrix. The final integrated candidate runs the entire required matrix. Do not repeat an exhaustive viewport sweep for a verified formatting-only commit unless it changes rendering or exposes a new concern.

# Change 1 Native dialogs and overlays

Start with `GameDialog.tsx`, its callers, `PublicInspectionModal.tsx`, and the related backdrop styles. Inventory settings, recovery, rollback, fleet inspection, public inspection, and any confirmation overlays before deciding which are modal.

Replace the custom modal focus trap and Escape handling with one React wrapper around native `dialog.showModal()`. Keep accessible titles, deliberate initial focus, existing close callbacks, and backdrop-dismiss policy. Synchronize browser close and cancel events with React exactly once, including StrictMode mount and cleanup. Preserve dirty-form protections and use safe initial focus for destructive choices.

Shared-map inspection remains non-modal so the galaxy stays usable. Use ordinary panels or a supported popover where appropriate; do not turn every inspector into a blocking dialog. Newer dismissal attributes and anchor positioning are optional enhancements subject to the browser support policy. Do not add a polyfill by default.

Validation must cover opening by mouse, keyboard, touch, and programmatic game events; forward and backward Tab; Escape; close button; backdrop press/release; reopening; initial focus; focus restoration after the invoking control disappears; long content; and narrow landscape scrolling. Verify that inactive background controls cannot activate behind a modal and that intended map interaction remains available beside non-modal inspection.

Specifically test native top-layer interaction with the dice portal, skip button, settings, fleet inspection, and combat overlays. Opening or closing an overlay must not replay dice, submit an action, lose a draft, or leave a transparent input-blocking surface. Check modal body scrolling and background scroll behavior in all three browser engines.

# Change 2 Responsive layout and CSS ownership

Start with `SecondDawnBoard.tsx`, `mobileBoard.css`, `game.css`, `visualPlay.css`, and `second-dawn.css`. Map which stylesheet owns the shell, workspace, inspector, action controls, and overlays before moving rules.

After shell extraction, prototype a layout in which header and footer use their natural sizes and the workspace owns the mobile sheet. Prefer grid or flex sizing, explicit scroll containers, `min-height: 0`, and available workspace space over DOM measurements fed back through React state. Delete `mobileWorkspaceTop`, `mobileBottomInset`, and their measurement effect only after equivalent behavior is demonstrated.

Preserve `100dvh`, safe-area treatment, mobile sheet closed/peek/expanded behavior, map visibility, and reachable commit controls. Keep measurements genuinely needed for galaxy geometry and zoom. Use container queries where a reusable panel must respond to its actual available width; retain behavioral media queries where the interaction changes.

Consolidate repeated selectors and overrides one component at a time. Establish tokens for shared spacing, colors, and control sizing where they reduce real repetition. Do not globally remove `!important`, introduce cascade layers without auditing unlayered rules, or rewrite all CSS into another system.

Validation must include maximum-content fixtures, long labels, wrapped header rows, short windows, tall panels, scroll boundaries, soft keyboard obstruction, safe areas, orientation changes, zoom, enlarged text, and overlapping sheets. Compare useful map area, control positions, information density, and action steps against the baseline. The browser must expose the final item and confirmation control in every overflowing panel.

# Change 3 Board responsibility and state ownership

Retain React, the shared rules engine, Convex authority, existing planners, and existing persistence. The root board should compose coherent modules and connect their typed interfaces.

| Proposed module | Owns | Must not own |
| --- | --- | --- |
| `SecondDawnBoard.tsx` | Provider composition and connections between session, controllers, and views | Detailed layout, independent copies of game state, all action-specific feedback |
| `BoardShell.tsx` | Header, roster, navigation placement, workspace and inspector regions, responsive presentation | Rules, command execution, persisted action drafts |
| `BoardWorkspace.tsx` | Explicit selection and assembly of existing activity components | A second navigation store or duplicated planners |
| `BoardInspector.tsx` | Contextual sector/history/action content and local focus/scroll behavior | Global navigation policy or backend mutations |
| `useBoardNavigation.ts` | Named transitions between viewing, editing, inspection, and return destinations | Mirrored screen/action fields outside their authoritative owner |
| `useBoardCommands.ts` | Submission guards, queue routing, acknowledgement correlation, typed lifecycle results | Rule calculations already in shared code or local mutation of authoritative game state |
| `useBoardMap.ts` | Selection, camera commands, highlight composition, temporary map snapshots and restoration | Gesture mathematics or a second camera store |
| `EncounterWorkspace.tsx` and companion hook | Battle presentation, remembered ships, playback, aftermath, reputation, continuation intents | Battle resolution or automatic gameplay changes |

## State ownership rules

Inventory every state field and effect before extraction. Classify it as authoritative game state, persisted draft/navigation state, transient presentation state, derived data, or external effect. Assign one owner and identify the reset key: match, player, decision, encounter, revision, or deliberate user action.

Keep `ActionDraftProvider` as the authoritative persistence owner for existing screen, action, camera, selection, and draft fields. Add a typed atomic transition operation there where needed. Do not mirror these fields in an independent reducer and synchronize them with effects. A pure transition function can calculate a patch applied by the existing owner. Preserve storage format and defaults initially; any later migration needs separate tests.

Navigation exposes intent such as browse technologies, start movement, inspect player, return to decision, and close activity. Viewing a workspace, having an active editor, and retaining a saved draft remain distinct. Prefer deriving redundant booleans after characterization tests establish their meaning.

Submission exposes lifecycle events distinguishing submitted, queued, accepted, reflected in the authoritative view, and rejected. Correlate receipts with the originating match/player/action using existing protocol identifiers where available. Handle view-before-receipt and receipt-before-view ordering. Build and movement keep their specific continuation/result wording near their own workflow. Test duplicate receipts, new object identities containing the same receipt, and a later same-type action arriving after navigation or reconnect. Keep authoritative view/live candidates distinct from projected next-turn view/candidates: required decisions always use authoritative inputs. Do not expand the backend protocol merely to make extraction convenient.

An inspection coordinator above map and navigation records a typed return snapshot and restores both through their public operations. Navigation owns workspace restoration; map owns camera and selection restoration. These modules must not import one another. Fixed fit overrides automatic zoom requests consistently. Keep `useGalaxyGestures` intact unless a separately demonstrated issue requires changes.

Battle presentation has a deliberate lifetime keyed to encounter identity. Preserve mounted decision editors and playback where hiding them currently preserves state. Reset remembered ships, pending receipts, and inspection snapshots when match or player changes. Keep audio, timers, and focus effects out of pure reducers.

## Extraction sequence and acceptance

First extract render-only header/roster, inspector, and workspace regions without changing DOM order, classes, conditional mounting, keys, or handlers. Then replace scattered setter sequences with named navigation operations. Next isolate submission tracking, then map coordination, then battle presentation. Remove redundant state only after all existing transitions are exercised.

Each module takes narrow typed inputs and named callbacks. Do not pass the entire old board state through one giant context or move the monolith into a giant hook. Add context only for a genuinely shared concern and avoid circular controller dependencies.

Acceptance scenarios include switching activities with unfinished drafts; changing viewport while editing; inspecting history and restoring the prior view; multiple move/build activations; a decision arriving during inspection; a queued action becoming invalid; delayed acknowledgement; reconnect; and finishing combat into upkeep or scoring. These scenarios must preserve commands, visible choices, number of clicks, drafts, and camera behavior.

# Change 4 Verification tooling

Make one documented quick-check command and one complete verification command. Reuse the memory-safe batched test runner; do not increase concurrency until memory behavior is measured. The complete command must include lint, real type checking, all discovered unit/integration tests, tool tests, a non-publishing production-mode frontend build, and the required browser regression suite. Separate verification from release commands: build:vercel invokes backend publication and must not be used by reviewers as a harmless local build. Audit code generation and environment requirements so ordinary verification does not mutate a deployment.

Correct the standalone typecheck command so it checks the actual app, tool, and shared-rule projects. Inventory backend and test typing separately and specify what is covered. The existing build already uses `tsc -b`; avoid introducing a second conflicting project configuration.

Inventory every test file and browser script, including colocated tests and non-Vitest tests. Record discovered versus executed versus skipped counts. The current batched runner prioritizes `src/__tests__`; audit other locations so consolidation does not silently omit tests. Preserve existing assertions when migrating browser scripts into common fixtures and runners.

Use shared deterministic fixtures, startup/teardown helpers, browser configurations, viewport definitions, seeded randomness, controlled clocks, and semantic readiness conditions. Replace arbitrary sleeps where possible. Keep live-backend tests isolated from saved production games; use disposable matches and record cleanup.

Replace PNG byte comparison with decoded-pixel comparison and expected/actual/difference artifacts. Compare like-for-like browser, operating system, fonts, device scale, fixture, and frame. Start with strict comparison; permit narrowly documented rasterization tolerance only after inspecting actual differences. Never use a broad difference percentage to excuse a missing control. Baseline updates are a separate explicit operation.

Prove the harness can fail: temporarily introduce a missing button, covered commit control, clipped panel, lost draft, changed command payload, and a type error in an included project. Each appropriate gate must fail; then remove the deliberate faults and rerun. This validates the new gate itself.

A successful Node unit test of the screenshot comparator is not evidence that browser screenshots were produced or inspected. The complete command must invoke the actual browser checks and report missing baselines, missing engines, empty test selection, skipped required tests, and unavailable fixtures as incomplete, not passing.

# Change 5 Formatting and development conventions

Adopt one formatter and deterministic format-check command. Apply formatting in separate mechanical commits, starting with modules scheduled for extraction; avoid a repository-wide rewrite in the same change as behavior or layout work. Verify mechanical commits with the same relevant gates.

Replace conflicting instructions in `AGENTS.md` and development documentation with the actual quick/full commands, memory-safe execution policy, module ownership, persistence boundaries, browser support policy, and adversarial evidence requirements. Remove obsolete claims that the full suite cannot run once the batched path is verified.

Use native browser features when they remove maintained code and meet the tested browser floor. Treat newer APIs as enhancements unless verified across the supported browser matrix. Keep React/Vite/Convex, SVG galaxy rendering, existing Pointer Events handling, and lazy-loaded Three.js dice. No new state-management library, framework migration, or wholesale styling migration is included.

Acceptance is executable documentation: a fresh checkout can follow the instructions and obtain the same test inventory, build, browser checks, and evidence locations without undocumented manual steps.

# Baseline and comparison strategy

Freeze a baseline commit and candidate commit for each slice. Before implementation, run the current gates and capture representative game states using synthetic or sanitized fixtures. Record browser versions, OS, device scale, fonts, viewport, seed, clock settings, motion/sound preferences, session identity, scenario, and exact screenshot state. Use separate fresh browser contexts and isolated storage, seeded with identical saved-game, draft, identity and preference snapshots; clear unrelated storage and service-worker state. Verify representative responsive scenarios against production-mode assets and actual deployment configuration, not only Vite development fixtures.

Use three independent oracles:

1. **Rules and commands:** replay the same seeded command sequences through baseline and candidate. Compare legal commands and authoritative game state, including resource tracks, fleets, technologies, discoveries, reputation, scores, queues, and RNG progression. Normalize only a documented allowlist of nondeterministic metadata such as transport timestamps; never normalize away revisions, queue status, ownership, costs, or gameplay fields.

2. **Player journeys:** run the same semantic interactions through both builds. Compare submitted command payloads, queue versus submit routing, draft snapshots, visible information, focus, camera, and action count at checkpoints. Record a semantic trace at checkpoints: input, emitted command or queue operation, acknowledged revision, visible workspace, enabled actions, draft summary, camera mode, focus target, and user-facing feedback. Network delays and response-order scenarios must be deterministic.

3. **Rendered experience:** compare screenshots and inspect the actual before/after images, then validate geometry, hit targets, scrolling, keyboard focus, and touch interaction. Static screenshots and DOM assertions complement each other.

Check full viewports as well as cropped component images. Capture default, open, selected, preview, confirmation, submitted/queued, result, scrolled-to-end, dismissed, and restored states as applicable. Capture overlays after keyboard focus moves. Freeze animation for still-image parity, but separately test real motion, audio, skip, and reduced-motion flows.

No reviewer may approve solely from code, an implementation summary, or a generated image count. Preserve the previous accepted baselines; never regenerate expected screenshots from the candidate during a test.

# Screen and browser coverage

All sizes below are CSS pixels. The tested envelope is 320 to 2560 pixels wide with supported portrait, landscape, and desktop heights. It is not possible to enumerate every device; cover representative sizes, every actual breakpoint, and continuous resize behavior.

| Class | Required viewport anchors |
| --- | --- |
| Narrow phones | 320 × 568; 360 × 640 |
| Main phones | 390 × 844; 412 × 915 |
| Short landscape phones | 568 × 320; 844 × 390; 915 × 412 |
| Small tablet | 600 × 960 |
| Tablets | 768 × 1024; 820 × 1180; 1024 × 768; 1180 × 820 |
| Short desktop | 1024 × 600; 1280 × 600; 1280 × 720; 1366 × 768 |
| Desktop | 1440 × 900; 1920 × 1080 |
| Wide desktop | 2560 × 1440 |

Run the critical interaction journeys in Chromium, Firefox, and WebKit at 390 × 844, 844 × 390, 1024 × 768, and 1440 × 900. Run the core visual-state catalog at every anchor in Chromium, plus cross-engine visual coverage at those four anchors. Add any browser-specific layout case to all affected engines.

Discover media and container breakpoints from the actual styles at implementation time. Check one pixel below, at, and above each breakpoint, including height and coarse-pointer conditions. Sweep widths from 320 through 2560 in increments no larger than 32 pixels for core shell/overflow/hit-target checks, with heights 640 and 900; separately cover short landscape and resize existing mounted sessions in both directions. Inspect intermediate failures and add durable regression cases.

Test keyboard plus mouse, coarse-pointer/touch settings, and DPR 1 and 2 on representative devices. Test 200 percent browser zoom, 400 percent reflow on a desktop viewport, and enlarged text. CSS zoom or device scale emulation is not equivalent to browser zoom or OS text scaling; record the actual method. The map may retain intentional two-dimensional pan/zoom, while surrounding controls and explanations must remain usable.

Before claiming mobile-device validation, perform real iOS Safari and Android Chrome smoke checks for browser-toolbar expansion, soft keyboard, safe areas, rotation, scrolling, and native gestures. Playwright WebKit is useful engine coverage but is not a physical iPhone. If physical-device evidence is unavailable, record it as an outstanding gate rather than claiming full device validation. Pin the exact browser versions used and document the oldest supported versions when implementation begins.

Inspect short recordings or interactive traces for AI handoff, mobile sheet expansion, modal transitions, and combat continuation. Verify transient feedback remains observable and controls are not briefly covered or redirected. This evidence supplements still-image comparisons.

# Visual acceptance checks

A component passes only if the player can perceive and operate it in its intended state.

| Check | Required evidence |
| --- | --- |
| Visibility | Nonzero rendered area; correct visibility and opacity; expected content inside its viewport or reachable scroll container; no unintended clipping |
| Occlusion | Multi-point hit testing inside actionable controls; expected element or descendant receives the hit; browser click/tap succeeds without force |
| Readability | Actual screenshot inspection for legible text, sufficient contrast, wrapping, selected/disabled distinctions, and essential labels; do not shrink text to fit |
| Reachability | Scroll to final item and confirm/close controls; no scroll trap, stranded footer, or inaccessible nested panel |
| Focus | Visible focus ring, logical order, no focus behind blocking modals, correct return location, no clipped focused element |
| Space | Useful map area and panel content remain comparable to baseline; headers and footers do not crowd gameplay out |
| Touch | Primary interactive controls target at least 44 × 44 CSS pixels where feasible; any existing smaller targets documented and not reduced; gesture handling does not swallow taps or scrolling |
| Feedback | Costs, legal targets, confirmation, saving, queued, failure, and completion messages remain visible at the relevant moment |
| Layering | Modal backdrop, non-modal inspector, dice, menus, notifications, and mobile sheets stack and accept input correctly |
| Content extremes | Long player/faction labels, many ships, full technology lists, large histories, populated sectors, maximum relevant choices, and error text remain usable |

Check ancestor overflow clipping, not just viewport bounds. Reject new unintended horizontal document scrolling while permitting intentional galaxy panning and designed horizontal lists. Reuse the existing assertUncovered approach from the header browser test. Use unobstructed hit testing at multiple safe points, not only the center, and distinguish intentionally clipped decorative shapes from actionable elements. Scroll an offscreen control into view through the normal UI before testing it; do not count every offscreen list item as a defect. Do not force clicks to bypass overlays.

For every required visual case, the reviewer opens the baseline, candidate, and difference images and records an observation. Use contact sheets for broad comparison, then inspect full-resolution images and close crops wherever text, alignment, or overlap is ambiguous. Any unexplained disappearance, obstruction, loss of information, extra step, or unusable layout blocks the slice.

Browser automation capabilities differ. Preserve equivalent viewport and input scenarios across engines, recording the method actually used. Do not assume Firefox supports identical mobile-emulation flags or that synthetic pointer events prove native touch gestures.

# Gameplay and interface scenario catalog

| Scenario | Adversarial challenge and invariant |
| --- | --- |
| Home and setup | Change factions and options at narrow widths; open settings; long descriptions remain readable and start controls reachable |
| Explore | Select valid frontier, inspect/rotate/confirm sector, resolve discovery/control; preserve wormhole legality, remote explore, camera and return flow |
| Build | Choose pieces before placement; multiple sectors and activations; retain order through inspection, resize, and delayed acceptance |
| Move | Split ships across destinations, chain routes, inspect odds, handle pinning/retreat; preserve draft and remaining activations |
| Research | Select technology, funding and track, confirm inline; preserve costs, selection and result acknowledgement |
| Upgrade | Edit parts and ancient components, switch ship classes and inspect another player; draft lifetime and component supply remain correct |
| Influence and colonization | Multiple targets, advanced planets, bankruptcy and upkeep colonization; all choices and commit controls reachable |
| Trade and diplomacy | Bank/guild trade, betrayal warnings, exchanges and opponent inspection; preserve privacy and confirmation sequence |
| Queued actions | Plan off turn, queue, refresh, cancel, execute or fail after state changes; never announce execution on queue acknowledgement |
| AI turns | Watch, dismiss, inspect elsewhere, return, end turn rapidly; preserve follow preference and avoid attention stealing |
| Combat | Dice and skip, allocation, retreat, reputation, successive battles, aftermath to upkeep/scoring; no duplicate playback or lost controls |
| History and scoring | Load older entries, inspect map references and score contributors, close and restore context; no hidden information leaks |
| Recovery | Disconnect before/after submit, receipt/view reordered, stale draft, refresh, reopen saved game, switch match/player; no duplicate action or crossed session state |
| Settings and overlays | Open while dice, inspector, or pending decision is active; restore focus, camera, scroll and draft correctly |
| Faction stress cases | Exercise available base, expanded, and sci-fi abilities that alter actions, pieces or targeting, including remote explore, factories, copied parts and combined activation budgets |
| Responsive transitions | Resize and rotate during each critical draft, pending decision and modal; preserve component identity, draft and scroll where expected |

Use catalog-derived coverage for all faction/rules profiles rather than assuming the named examples exhaust the game. Full deterministic engine regressions cover the broader combinations; browser scenarios target distinct interaction shapes. Final integration includes at least one complete solo game and a disposable two-client multiplayer game, including reconnect, a queued action, combat, upkeep and final scoring.

# Adversarial subagent protocol

Implementation and verification have separate ownership. A builder cannot approve its own slice. Reviewers receive the baseline and candidate revisions, launch instructions, fixture catalog, player contract, and evidence requirements. They are asked to find counterexamples, not confirm the builder’s claims.

| Reviewer | Mission | Required output |
| --- | --- | --- |
| Gameplay reviewer | Break command equivalence, draft persistence, queue routing, turn handoff, recovery and combat lifecycle | Reproduction steps, command/state evidence, regression test, severity |
| Responsive visual reviewer | Find hidden, clipped, covered, illegible or unreachable components across screen sizes | Inspected before/after images, viewport/browser, scroll/focus/hit-test evidence |
| Architecture and lifecycle reviewer | Find duplicate ownership, remount resets, stale closures, cross-session leakage and false-positive gates | Code locations, lifecycle scenario, missing test or boundary correction |

Use up to three focused reviewers concurrently, matching the repository’s current concurrency guidance; batch memory-heavy browser/test work to avoid false failures. Each reviewer must invent at least two additional challenges beyond the predefined catalog. Review the actual candidate independently before reading the builder’s pass summary.

Findings use: scenario ID; baseline and candidate revisions; browser/viewport/input; starting fixture; exact steps; expected and actual result; screenshot/trace/state evidence; severity; owner; retest status. Distinguish pre-existing behavior from candidate regressions by reproducing both.

Lost game state, wrong command or outcome, private information exposure, inaccessible mandatory controls, blocked progression, or broken supported layouts are release blockers. Any other unexplained experience difference remains unresolved until fixed or explicitly accepted as a separate product change.

After a fix, the original reviewer reruns the reproducer and another reviewer checks neighboring states or screen sizes. A skipped or unexecuted check is not a pass. Before release, rerun required gates on the exact final candidate after all fixes; earlier passing evidence cannot cover later edits.

# Evidence and release checklist

For each slice, retain a compact evidence manifest with baseline/candidate SHA, environment, fixture/seed, scenario, viewport/input, expected/actual/diff screenshot paths, trace/video where needed, command/state assertions, reviewer observations, findings and retest status. Store reusable fixtures and test definitions in the repo; put large run artifacts in the project’s chosen artifact storage with links from the ledger. Preserve reviewed visual baselines separately from disposable screenshots.

Do not collect screenshots of personal or unrelated account content. Use synthetic names and disposable test matches.

- [ ] Baseline is reproducible and pre-existing blockers are classified.

- [ ] Every state/effect moved has one documented owner and reset lifetime.

- [ ] Lint, real type checks, all required tests, tool tests and production build pass.

- [ ] Test inventory demonstrates no dropped tests or silently skipped required cases.

- [ ] Rules and command replay comparisons pass.

- [ ] All mandatory journeys pass with drafts, queue semantics and camera preserved.

- [ ] Required screenshots were rendered and independently inspected.

- [ ] Visibility, occlusion, scrolling, focus and click/tap checks pass.

- [ ] Breakpoint boundaries, resize transitions and cross-engine matrix pass.

- [ ] Real mobile smoke evidence is recorded, or the unmet gate is clearly held open.

- [ ] Adversarial findings are resolved and retested on the final candidate.

- [ ] Documentation and commands match the delivered structure.

- [ ] Rollback to the prior tested commit is straightforward and preserves saves.

Keep schema and saved-data changes out of this refactor. Release in small revertible slices under the existing deployment policy once their gates pass. Verify the Git-triggered Vercel deployment points to the tested commit and run a post-deploy smoke on disposable sessions. The existing Vercel build invokes backend publication; identify this side effect before release. Preserve that gate’s checks and verify it publishes no backend/schema changes for these UI-only slices. If a safe frontend-only release path is needed, establish and validate it as a separate release-tooling change rather than bypassing checks ad hoc. Do not run an additional Convex publication or alter Convex data merely for a UI extraction. On regression, revert the offending slice; do not reset player data.

The current request authorizes this plan. Implementation and runtime validation are the next phase; no implementation or test-passing claims are implied by this document.

# Planning review findings incorporated

Three independent adversarial reviewers examined the preservation strategy. Their recommendations are incorporated into the work and gates above.

| Challenge | Plan response |
| --- | --- |
| Responsive extraction can silently remount editors | Inventory keys and mounting behavior; resize mid-draft and compare persistence and payloads |
| A new navigation reducer can duplicate persisted state | Keep one owner in ActionDraftProvider; expose atomic typed transitions |
| Queued and accepted actions can be confused | Compare routing and semantic traces; test delayed, duplicated and reordered receipts |
| A visible DOM node can be covered by the footer or sheet | Inspect screenshots and verify clipping, multi-point hit testing, natural scrolling and unforced clicks |
| Native top-layer dialogs change dice and menu interaction | Exercise combined overlay states, skip controls, focus, scrolling and StrictMode |
| A passing test command can omit tests or publish unexpectedly | Inventory discovery, inject temporary negative controls, separate verification from release |
| Screenshots alone miss transient regressions | Review motion-enabled recordings and traces alongside deterministic stills |
| Independent passing slices can fail together | Run the entire required matrix against the exact integrated production candidate |

These are planning-review findings, not claims that runtime validation has passed.

# Reference points

- [Reviewed Eclipse revision](https://github.com/a1j9o94/eclipse-rougelike/tree/cb6c932cc11ad30487a23862256f3aef5c2d650f)

- [SecondDawnBoard](https://github.com/a1j9o94/eclipse-rougelike/blob/cb6c932cc11ad30487a23862256f3aef5c2d650f/src/second-dawn-game/SecondDawnBoard.tsx)

- [GameDialog](https://github.com/a1j9o94/eclipse-rougelike/blob/cb6c932cc11ad30487a23862256f3aef5c2d650f/src/second-dawn-game/GameDialog.tsx)

- [Verification commands](https://github.com/a1j9o94/eclipse-rougelike/blob/cb6c932cc11ad30487a23862256f3aef5c2d650f/package.json)

- [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)

- [Native dialog guidance](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-components/dialog.md)

- [Responsive design guidance](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/css/responsive-design.md)

Browser feature support must be checked again against official documentation at implementation time. Guidance informs implementation choices; the player contract and verified behavior determine acceptance.
