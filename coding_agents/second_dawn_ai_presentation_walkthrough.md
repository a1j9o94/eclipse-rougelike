# AI turn presentation — browser walkthrough plan

## Player outcome

After ending an action or passing, a player can follow which AI is acting, what it changed, where it happened, and when control returns to the human.

## Acceptance criteria

- In a real solo game, an AI turn remains visible long enough to read; verify the intended minimum one-second presentation interval with timestamps from browser observations.
- Consecutive AI actions generate distinct readable summaries rather than replacing each other too quickly or exposing raw command payloads.
- Sector-affecting actions point to the affected location. Fleet moves visually identify their source and destination when animation is enabled.
- The authoritative board, resources, turn ownership, and available human commands remain consistent with server state during presentation.
- Returning control to a human is clearly visible and the appropriate actions become usable.
- A player can reduce or skip motion using the supplied control; reduced-motion browser preferences do not require watching travel effects.
- Reconnecting during AI activity restores the current authoritative state and does not replay an unbounded historical animation queue.

## Task-based walkthrough

1. Start an actual solo room with two AI opponents. Note the current human turn, resources, and initial history state.
2. End a legal action, or pass when exercising several consecutive AI actions. Observe the active AI's name, turn summary, and timestamps. State what the first AI did using only the visible presentation.
3. Follow the next AI action. Identify its affected sector or fleet route without opening unrelated inspectors. Compare the public history afterward to confirm that the visible summary matches the accepted action.
4. Wait for control to return. Identify the human's next required choice without relying on animation completion or manually refreshing.
5. Repeat with reduced motion enabled and with the in-game motion control. Confirm that summaries and ownership transitions remain understandable and all required human controls remain accessible.
6. Disconnect during an AI turn, reconnect, and verify that current state returns without reprocessing old commands. Read-only API checks may substantiate revision/actor state but must not substitute for the visible user experience.

## Recording and visual review

Record task success, wrong turns, elapsed search time, assistance needed, observed presentation intervals, and any mismatch between summaries and authoritative history. Separate agent-operated evidence from later user playtest feedback. Capture the visible AI summary, affected sector/route, and returned human control at 1366×768, 1440×900, and 1920×1080; inspect actual images for readable text, panel coverage, overlap, and motion settings. Capture animation evidence through sampled frames or browser-observed DOM state rather than claiming a still screenshot proves movement.

## Implementation/test coordination

The supervisor owns AI presentation and provides final accessible selectors before the browser harness is authored. The fleet agent owns fleet visuals. This review agent owns only the browser harness and review records. Browser tests use real solo matches and accepted commands; any deterministic fixture coverage should be reported separately. No credentials, room tokens, private recovery codes, or PINs may be stored in screenshots or logs.

## Risks and rollback

Visual delays can conceal a newer server state or cause apparent input lag if commands and presentation are coupled. Verify that displayed choices use the current revision and that motion controls remain available. Presentation should be reversible without changing saved matches or rules. The browser timing assertion must measure the intended presentation interval, not confuse network latency or AI computation time with an animation delay.

## First integrated browser review

`tools/second-dawn-ai-presentation-browser.mjs` passed against the local Vite app and approved development backend after the pacing deployment. The first observed cycle contained 15 accepted AI decisions and 14 distinct visible summary strings. Observed intervals between visible summary changes were 1,125–2,395 ms. The repeated colonization summary explains why the number of distinct text changes is smaller than the journal count; the harness does not claim to measure server scheduling directly.

The agent completed two human exploration/discard/end-action cycles, observed AI actions and return to human control, disabled animations for the second cycle, reloaded, and tested a separate reduced-motion browser context. Map highlights appeared with motion enabled, disappeared with motion disabled while summaries continued, the preference survived reload, and old history was not replayed as new effects. Zero page errors; nine screenshots across the three desktop sizes show no horizontal overflow. The AI bar is legible and does not overlap controls. Natural opening AI turns did not move ships, so this run supplies no actual fleet travel evidence; targeted movement coverage must be reported separately.

Reviewer finding: the default 160% camera centers the human territory and can leave the opponent's changed sectors outside the visible galaxy. A DOM highlight alone does not establish that the player saw where the action happened. Reported to the supervisor for an action-location affordance or another camera treatment. The walkthrough needs one camera adjustment to Fit before it can verify these offscreen sector highlights visually. Do not mark this navigation finding resolved based only on the passing DOM test.

Evidence: `second_dawn_ai_presentation_browser/local/result.json`, its nine PNG files, and `logs/second_dawn_ai_presentation_browser_local.out`. These are agent-operated walkthrough and image-review results, not human user playtest evidence.

## Navigation finding resolved

The supervisor added **Watch AI** beside the activity summary. It switches to the galaxy and fits the whole board when the player clicks it; it does not force camera movement between turns. The updated browser walkthrough clicks Watch AI, then requires an affected sector's complete bounding box to lie inside the visible galaxy before each AI screenshot. This passes at all three desktop sizes. Actual images show the new sector within view and its pulsing outline, with the active faction and readable summary directly above the galaxy. The original offscreen-action finding is resolved through one explicit, labeled action.

The revised local run also passes pacing, motion-off, return-to-human, reload, and reduced-motion checks. It observes 14 accepted AI decisions, summary intervals of 1,103–2,495 ms, no horizontal overflow, and zero page errors. Movement is still not naturally observed in this opening-cycle run. The overwritten local artifacts now contain the final Watch AI presentation rather than the initial review screenshots.

## Bounded movement planner browser check

The separate `tools/second-dawn-movement-chain-browser.mjs` renders the real MovementPlanner with the movement unit suite's deterministic chain fixture and calls the pure authoritative command processor. Selecting one speed-one interceptor previews the combined route `1 → 101 → 103`, **2 / 3 move activations selected**, and one influence-disc cost. One confirmation submits the same ship twice, moves it through both sectors, spends one influence disc, leaves one activation, and preserves the input state. All assertions pass with zero page errors; the script is lint-clean.

The 1366×768 screenshot uses a 340 px inspector. Actual image review confirms the ship silhouette, two-activation label, three-sector route, cost preview, and entire confirmation button are readable and visible. Evidence is `second_dawn_movement_chain_browser/result.json` and `1366x768-two-activation-route.png`. This is an engine-fixture browser test with no cloud state injection; it does not establish cloud persistence or natural AI fleet movement.

## Automatic action inspector review

The supervisor added the visual AI action inspector with **Follow AI** enabled by default. The extended local browser run passes: an accepted AI exploration opens actual planet/population context automatically; Follow AI off restores the ordinary inspector; toggling on restores the action panel. Returning control to the human hides it, Watch AI reopens the last meaningful action rather than the end-action marker, and manual galaxy sector selection dismisses it. These behaviors are asserted through the real rendered controls and public journal.

This run observes 14 AI decisions and visible-summary intervals of 1,149–1,286 ms. The existing pacing, in-view sector highlight, motion toggle, reduced-motion preference, and reload checks still pass with zero browser errors. All three AI screenshots were visually inspected: the changed sector, faction/title, and planet icons are visible and aligned; extra sector details scroll in the shorter inspector. Only sector-context panels appeared naturally during these opening turns. Research cards and blueprint loadouts require the separately labeled fixture review; do not attribute those to this live-game workflow. Current local artifacts contain this final inspector presentation.

## Final live release verification

The extended harness passes on `https://eclipse-rougelike.vercel.app` after deployment `eclipse-rougelike-ro9bims03-obleton-adrian.vercel.app` became Ready. The observed opening cycle includes 17 accepted AI decisions with visible-summary intervals of 1,100–2,400 ms. The automatic sector-context panel, Follow AI off/on, normal-inspector restoration for the human, Watch AI reopening of a meaningful action, manual sector dismissal, visible affected-sector feedback, motion settings, reduced-motion default, and reload checks all pass. No page errors or horizontal overflow were recorded.

Nine production screenshots cover AI activity, human return, and motion-off at the three desktop sizes. Actual final AI images were inspected at every size: the highlighted sector and public planet details remain readable, the follow/watch/motion controls fit in the status bar, and the inspector does not cover the galaxy. Additional details use its existing vertical scroll. Only natural sector-context results appeared in this bounded run; research/blueprint fixtures and the isolated movement-chain browser test remain separate evidence.

Final artifacts: `second_dawn_ai_presentation_browser/live/result.json`, the nine PNGs in that directory, and `logs/second_dawn_ai_presentation_browser_live.out`. The checks use public UI and the viewer-authorized journal; credentials, room links, and private choices are not recorded.
