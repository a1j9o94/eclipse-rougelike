# Independent review of rendered gameplay screenshots

Reviewer: rules_audit subagent, separate from UI implementation. Evidence: actual PNGs rendered from deterministic engine snapshots, not source-only review. This is model-based visual inspection, not human playtest evidence. No task success rates/search times or human assistance measures are claimed.

Initial set inspected: `second_dawn_gameplay_screenshots/1366x768-{opening,late,research,blueprints,combat,scoring}.png`, `1440x900-midgame.png`, `1920x1080-late.png`. UI agent reports these derive from a six-seat seed106 game advanced through704 legal commands.

| Finding | Initial evidence | Severity / resolution |
|---|---|---|
| Galaxy fit underuses canvas and renders unreadable microtext | 1366 late36-sector galaxy occupies roughly365×280 inside850×510 canvas; opening roughly300px wide. Ownership labels/ship counts ~6px. 1920 is better but still leaves large unused margins. | High; sent to UI agent for canvas-fitting and zoom-detail changes. Open pending fresh rendered review. |
| Sixth civilization clipped at768px height | Orion hidden below visible left list; late screenshot's active player is Orion, while every visible civilization says waiting. | High; compact or scroll affordance needed. Open. |
| Unrelated Explore workflow remains in every view | Blueprint/research/combat/scoring retain Explore right panel, including generic no-options and waiting-your-turn on finished game. | High; context-dependent panel contents needed. Open. |
| Blueprint confirmation/stat block below fold | At1366×768 only energy/hull/movement/initiative beginning visible; confirm below screen. | High; sticky confirmation or compact layout needed. Open. |
| Research effects and exact unavailable reasons missing | Cards show names/costs but not effect/ship stats; same generic unavailable message for already-owned and unaffordable technologies. | High; contextual effect and specific legality reasons needed. Open. |
| Combat choice lacks tactical context | Allocation screen shows a die and selector without sector, opponent, ship HP/shields/computers or hit explanation. Raw `die-110` identifier visible. | High; battle and target stats required in current workflow. Open. |
| Scoring lacks immediate winner/rank summary | Starts with Eridani12 and Hydran28 below; no winner/tiebreak banner, all breakdowns expanded. | Medium; winner/rank overview before details needed. Open. |
| Opening copy reused in late game | Round8 headline reads “Your empire awaits.” | Low; use meaningful current galaxy/selection heading. Open. |

Positive observations: coherent dark palette, restrained effects, consistent typography/panel borders; primary resource balances and red text “shortfall” are clearly visible, providing non-color status. Basic tab labels and control grouping are readable at1366. Ownership has Roman numeral IDs as a non-color marker, although tiny galaxy scale undermines their usability.

All initial findings were sent directly to UI agent and critical readiness gaps reported to root. No screenshot baselines were accepted during this review. Re-review should use newly rendered files after fixes and record each resolved/unresolved item here.

## Second rendered review

All21 fresh captures inspected: opening, midgame, late, research, blueprints, combat and scoring at1366×768,1440×900 and1920×1080. These are the refreshed September7 16:15 images, reviewed directly after the initial fixes.

| Finding | Re-review outcome |
|---|---|
| Galaxy fit and microtext | Resolved for inspected fixtures: fit now follows actual rectangular canvas; crowded sectors occupy useful height, ownership stays visible while tile IDs are omitted at crowded scale. Zoom remains available for detail. |
| Sixth civilization clipping | Resolved at1366: all six civilizations and pending-choice status are visible. |
| Stale action panel | Resolved in blueprint, combat and scoring. **Still open in Research:** Explore remains selected and its unrelated no-options explanation remains visible. |
| Blueprint confirmation | Resolved for the captured interceptor draft: stats, projected upkeep and confirmation are visible at1366. Dreadnought eight-slot editor needs separate walkthrough evidence. |
| Research explanation | Partially resolved: owned technologies are identified and affordable ones show discounted prices. **Still open:** Gluon Computer costs13 with8 science but incorrectly reports no remaining activation/track space. Effects remain category labels on cards; inspectable detailed stats need interaction verification. |
| Combat context | Major issue resolved: sector, participants, ships, HP, shields and computers are present alongside allocation. Low-severity presentation issue remains: internal ship IDs and global die110 identifier should become simple local labels. |
| Final ranking | Resolved: sorted standings, winner and resource tiebreak explanation appear before collapsible breakdowns. At768px the sixth row is below the scrollable content fold, while all six are visible at900px. |
| Late headline | Resolved: current round galaxy heading. |

Research defects and remaining combat labels were sent to the UI implementer for another pass. The revised screens are materially clearer, but no automatic snapshot approval replaces the unresolved interaction and human-playtest gates.

## Final targeted recapture review

Directly inspected final Research captures at all three sizes and1366 combat after the second fix pass. Research now selects its own action/footer and shows the correct contextual selector. Gluon Computer explicitly costs13 science against8 available; Quantum Grid states two influence discs and15 science against8. Part benefits are visible directly on cards. Both remaining high-severity research findings are **resolved**.

All major initial rendered findings are resolved in the inspected21-screen set. The low-severity combat-label finding remains: internal ship identifiers and global die110 are still displayed. Static images alone do not establish keyboard/enlarged-text behavior, eight-slot draft scrolling, successful tactical walkthroughs, or human usability. Those evidence categories remain separate in the supervisor's validation report. This review accepts the inspected layout/readability changes, and does not certify unobserved interactions or establish automated screenshot baselines.

## Supervisor final addendum

The final display-only combat corrections were inspected in the actual1366 capture: local numbered ship/die labels replace internal identifiers; a roll with no hittable targets states “no hit” and is assigned automatically; actual hits retain player selection and defense context. Combat action buttons are disabled and unpressed. The supervisor and UI implementer inspected this last recapture; it is not misattributed to the earlier independent reviewer.

All21 reviewed images were copied to `second_dawn_visual_baseline/` only after the above reviews. A subsequent fresh browser capture matched all21 byte-for-byte. Baseline comparison never updates those copies automatically. Human playtesting remains a separate, unclaimed evidence category.

## Later integrated visual pass

Directly inspected September7 19:07 captures at1366×768 for research, blueprints, combat and scoring. The horizontal civilization strip remains readable with all six seats visible. Research exposes costs, shortages and part effects; blueprint confirmation is sticky while the component grid scrolls. The combat capture now displays both fleets and two dice side by side, explicitly marks the miss as requiring no allocation, labels the remaining die locally as2, and keeps confirmation visible. Previous internal ship/die identifiers are no longer shown: the final low-severity combat-label finding is resolved. All six final standings now fit at this laptop size. This targeted recheck does not substitute for a fresh21-image review of every later layout change or for human playtesting.
