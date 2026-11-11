# Independent visual review

Status: candidate independently rendered; identified regression V4 fixed and independently verified. **No remaining candidate regression observed in this limited review. Full visual-preservation certification remains incomplete.** Existing short-landscape map defect V1 remains. User-requested chooser improvement subsequently resolves V2 in the tested short-landscape sizes; see follow-up below.

Reference: detached baseline `cb6c932cc11ad30487a23862256f3aef5c2d650f`. Browser: managed Chromium via CUA. Method: same-origin iframe with exact CSS viewport; desktop pointer. This is not native mobile-device or cross-engine evidence.

## Baseline findings

### V1 Short landscape hides map controls initially

- Fixture: opening; viewport 568 × 320.
- Screenshot inspected: `/workspace/shared/eclipse-baseline/opening-568x320.jpg`, plus direct live screenshot.
- Fit rectangle before interaction: x251.875, y324, width44, height44, bottom368. It is outside the 320px viewport.
- The usable `.sd-main` viewport is 96px tall while the galaxy content is 260px tall.
- Unforced Fit click succeeds because the browser scrolls `.sd-main` to scrollTop164. Fit then occupies y160–204 and center hit-testing returns the actual Fit button.
- Classification: pre-existing discoverability and short-landscape map-usability defect; not demonstrated to be unreachable. Do not report the successful automated click as evidence of good initial visual usability.
- At 844 × 390 the initial Fit rectangle is again y324–368, and its center hit-test returns the Empire footer button. The baseline screenshot `/workspace/shared/eclipse-baseline/opening-844x390.jpg` visibly shows the footer covering the lower galaxy. A later interaction in this size was contaminated by persisted Build state, so the initial screenshot and geometry are the reliable evidence here.

### V2 Action chooser has only a 29px body in short landscape

- Fixture: opening; viewport 568 × 320; action: Choose action.
- Live screenshot inspected: chooser header fills y125–188, then only the ACTIONS heading and a narrow scrolling strip are visible above the footer at y217.
- Sheet rectangle: y125–217, height92. Body rectangle: y188–217, height29; content scrollHeight345.
- Build action card is 86px tall, substantially larger than the body viewport. Initially its rectangle is y313–399.
- An unforced locator click can auto-scroll and activate Build despite the visually unusable sliver. This directly demonstrates why click success alone is insufficient.
- Classification: pre-existing visual usability defect. Candidate must be compared explicitly; preserving it is not proof that all supported landscape layouts are usable.
- Isolated repeat at 844 × 390: body y194–230, height36; Build card height86. Natural wheel scrolling reaches the end but exposes only partial card fragments. Independently captured and opened evidence: `/workspace/shared/eclipse-visual-review/baseline-844x390-action-chooser.jpg`.

### V3 Browser fixture sessions share draft storage

- Harness uses `matchId={'maintainability-'+fixture}` for all tabs and dimensions on the same origin.
- After this reviewer activated Build at 568 × 320, a newly navigated 844 × 390 opening fixture restored the Build activity.
- `frame.html` forwards only the fixture query; reviewer/session identity is not forwarded.
- Consequence: parallel reviewer tabs can influence each other through persisted draft state. Screenshots must verify clean expected state; baseline/candidate comparisons need isolated origins or explicit per-session fixture namespaces seeded identically.
- Review actions were paused after detecting interference. No application source was changed by this reviewer.
- Root subsequently added a `session` query passed through the frame into match identity. Isolated repeat used `session=visual-review-844-action`, which starts in the expected clean opening state. Continue all comparisons using distinct baseline/candidate session IDs with equivalent initial state.

## Candidate findings

### V4 FIXED: short-landscape chooser header was covered by the HUD

- Candidate live working tree; opening fixture at 568 × 320; unique session `visual-candidate-568-small`.
- Candidate sheet y26–217, height191; header y27–89; body y89–217, height128.
- Baseline sheet y125–217, height92; header was visible below the HUD. Candidate header has moved underneath the HUD/turn strip.
- Close action chooser rectangle x517,y29,width44,height57: its center hit is Game tools `<summary>`, not the close button.
- Collapse Actions details rectangle x7,y35.5,width507,height44: center hit is Open income and upkeep tracks in Command Center, not collapse.
- Actual screenshot inspected and saved: `/workspace/shared/eclipse-visual-review/candidate-568x320-action-chooser.jpg`. It visibly shows action cards and footer but no sheet title, close, or collapse controls.
- Likely cascade: `visualPlay.css` expanded-sheet viewport calculation still references deleted measured variables, defaulting to 67px header and 62px footer; it overrides relative-container max-height.
- Parent informed immediately and removed the stale viewport-variable overrides.
- Independent fixed-candidate rerender: 568 × 320 sheet restored to y125–217/height92; Close action chooser x517,y128,width44,height57 with correct center hit. Header visible in actual screenshot `/workspace/shared/eclipse-visual-review/candidate-fixed-568x320-action-chooser.jpg`.
- 844 × 390 fixed candidate: sheet y125–230.25/height105.25; Close action chooser x791,y131,width44,height57, correct center hit. Actual settled screenshot `/workspace/shared/eclipse-visual-review/candidate-fixed-844x390-action-chooser.jpg` inspected.
- V4 resolved in the served working tree. These results preserve baseline V2's narrow chooser body; they do not establish good landscape usability.

### Candidate checks completed before V4

- 844 × 390 chooser initially matched baseline: body height36.25 versus36, preserving V2. Evidence `/workspace/shared/eclipse-visual-review/candidate-844x390-action-chooser.jpg`.
- Preferences native dialog had `:modal` true; panel x162,y16,width520,height358 matched baseline. Screenshot `/workspace/shared/eclipse-visual-review/candidate-844x390-preferences.jpg` inspected.
- Real Tab traversal reached final History & undo control, scrolled fully into view at y305.45–349.45, height44; center hit was the control itself.
- Tab sequence traversed dialog controls without activating background controls. Two end-of-cycle positions reported iframe body; cannot infer a background-focus leak because browser chrome/outer-frame focus was not distinguished.
- Background Choose action click attempt did not activate the chooser while Preferences was open; native dialog remained open. Locator success alone is not evidence of actionability in this environment.
- Escape dismissed Preferences and restored focus to Preferences trigger.
- Public score sector inspection remains a non-native `section[role=dialog]`, with zero native modal dialogs. Exposed Sectors map button opened the sector list while inspection stayed open. Screenshot `/workspace/shared/eclipse-visual-review/candidate-844x390-public-inspection.jpg` inspected. Zoom in was covered by the inspection panel at this short viewport and did not activate; no baseline comparison was made for that overlap.
- Candidate 568 × 320 initial Fit position y324–368 and main clientHeight96/scrollHeight260 matched baseline V1.

### Post-fix portrait workflow spot checks

- 390 × 844 `workflow-finish-upkeep`: Collect income card/text/button visible in actual image. Button x218.33,y481.09,width128.67,height44; center hit correct. Screenshot `/workspace/shared/eclipse-visual-review/candidate-fixed-390x844-upkeep.jpg`.
- 390 × 844 `workflow-colonize`: opened Colonize, selected available gray planet, selected Money. Planner sheet y421–785/height364. Actual screenshot shows planet, population choice, internal scroll area, consequence/footer controls, and bottom navigation. Colonize 1 planet button x231.47,y727,width141.53,height44; center hit correct, fully above navigation.
- Screenshots `/workspace/shared/eclipse-visual-review/candidate-fixed-390x844-colonize.jpg` and `candidate-fixed-390x844-colonize-selected.jpg` inspected.
- These two portrait scenarios are candidate usability spot checks only: this reviewer did not capture their baseline counterpart. Upkeep trade/recovery states are not covered by the Collect income fixture.

## Outstanding checks

- Recheck final committed candidate if source changes after these working-tree observations.
- Complete baseline/candidate comparison for remaining viewport and fixture matrix.
- Test chooser natural scrolling, final controls, modal focus/backdrop/scrolling, shared-map non-modal inspection, and resize mid-draft with isolated storage.
- Inspect actual candidate images before any visual-preservation approval.
- Cross-engine, physical device, browser zoom and full responsive matrix remain unverified by this reviewer.


## Follow-up: user-requested short-landscape action chooser improvement

Independent review of served CSS candidate after explicit request to fix the tiny sheet. This is an intentional UX improvement, not pixel parity with the old chooser. No new blocker found in these checks.

| Exact CSS viewport | Chooser body | Observed behavior |
| --- | --- | --- |
| 568 × 320 | y123–320, 197px | Resource HUD and 44px close/collapse stay visible; ordinary wheel reaches all eight action labels and descriptions. First row fully visible initially; lower rows readable through scrolling. |
| 844 × 390 | y129–390, 261px | Six ordinary cards fully readable initially; wheel exposes Colonize/Trade fully. |
| 915 × 412 | y129–412, 283px | Six ordinary cards fully readable initially; wheel exposes final row fully. |
| 915 × 550 | y129–550, 421px | Short-landscape treatment active; all eight cards visible together; footer hidden during chooser. |
| 915 × 551 | y194–391.25, 197.25px | Standard layout resumes, footer and turn strip present; ordinary scroll exposes final row; no overlap found. |
| 390 × 844 | y396–741, 345px | Standard portrait treatment retained, map above sheet, footer/turn strip present, all eight cards visible. |

- At 568 × 320 selected Build without force. Build planner, turn strip, Close activity, and navigation appeared. Closing activity restored the galaxy. Reopened chooser, Collapse restored galaxy/footer with collapsed sheet; Close action chooser removed sheet and kept galaxy/navigation visible.
- At 844 × 390 selected Research after ordinary scrolling back to the top. Research workspace, turn strip, Close activity, navigation, and existing auto-pass footer appeared.
- All eight means six ordinary actions plus Colonize and Trade. Colonize is correctly disabled in opening fixture: label/description inspected, not activated. This is visibility/reachability of the choice list, not eight completed gameplay workflows.
- The Build planner at 568 × 320 and Research workspace at 844 × 390 remain cramped after restoring existing navigation. No claim is made that this chooser-only change resolves downstream short-landscape usability.
- Portrait layout is outside the new media rule and was visually spot-checked. No screenshot pixel comparison was run against the immediately preceding portrait candidate.
- All interactions used ordinary pointer/wheel or unforced semantic clicks. Images were captured in a separate call after AX state settled to avoid stale streamed frames.

Actual images captured and inspected in `/workspace/shared/eclipse-visual-review/`:

- `expanded-568x320-top.jpg`, `expanded-568x320-bottom.jpg`, `expanded-568x320-middle.jpg`, `expanded-568x320-build.jpg`
- `expanded-844x390-top.jpg`, `expanded-844x390-bottom.jpg`, `expanded-844x390-research.jpg`
- `expanded-915x412-top.jpg`, `expanded-915x412-bottom.jpg`
- `expanded-915x550.jpg`, `expanded-915x551-top.jpg`, `expanded-915x551-bottom.jpg`
- `expanded-390x844-portrait.jpg`

Scope remains managed Chromium, desktop pointer, exact CSS iframe viewports. This does not certify physical touch devices, Safari/Firefox, browser zoom, dynamic toolbars, or all game states.
