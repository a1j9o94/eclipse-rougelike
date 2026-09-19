# Command-center economy tracks

## Outcome and acceptance

The command center exposes full Money, Science and Materials income tracks, plus the influence upkeep cost curve in the same section. Players can locate current production, compare every future income value, and see the increase and total upkeep for another new action or reaction. No extra dialog or global board strip.

- All curves use `BASE_ECONOMY_TRACKS` and existing public seat positions, including faction setup gaps.
- Current/next markers have text and borders as well as resource colors. Each step has an accessible description.
- Income and upkeep are explicitly distinct; actions within an already-paid activation budget are not presented as additional influence spending.
- Three resources remain available together on the command-center page, without an accordion. Mobile wraps each complete curve into two rows and uses ordinary command-center scrolling.

## Implementation and sources

`EconomyTracks.tsx` supplies a generic read-only `EconomyTrack` and the four-row empire section; `EmpireOverview.tsx` mounts it after the resource totals. `empireOverviewModel.ts` now clamps empty influence slots to zero for stacked extra discs, matching the rules engine.

The canonical [track definitions](../shared/eclipse/tracks.ts) cite the publisher rulebook pp.4,6,24. The returned-cube zero-income case follows p.14. New action/reaction spending follows `beginAction` in [rulesState.ts](../shared/eclipse/rulesState.ts); a reaction consumes one influence disc. Public inspected-seat state supplies all positions; no private facts or rules state are changed.

## Tests and review

Six new behavioral tests and eight existing overview cases pass in a memory-bounded batch. Initial five cases failed because tracks were absent. Review caught and corrected an erroneous draft claim that reactions added no upkeep; the corrected reaction assertion was observed failing before implementation. A stacked-disc fixture failed with the old model's negative-slot exception, then passed after the authoritative zero-slot clamp was applied.

Coverage: all resource curves/current/next, all 14 upkeep entries and increments, another empire's data, passed reaction cost, no remaining influence discs, returned cube zero income, max income, extra stacked discs, unchanged input state.

Scoped ESLint, TypeScript and `git diff --check` passed. Browser error log was empty. Real preview `?position=opening-three#second-dawn-review`, then own empire selection, was used for screenshots. Saved images were opened and reviewed:

- [Desktop 1440×900](screenshots/empire-economy-tracks/desktop.png): all four complete curves visible together, readable current/next markers, no overlaps.
- [Mobile 390×844, income](screenshots/empire-economy-tracks/mobile.png): wrapped resource curves; ordinary vertical scroll reveals lower rows.
- [Mobile 390×844, upkeep](screenshots/empire-economy-tracks/mobile-upkeep.png): every upkeep cost fits without horizontal clipping, next new action and incremental labels readable above the bottom navigation.

No human playtest or physical-device evidence is claimed. Parent owns combined build/lint/release gates. Rollback removes the section import and new files; no persisted schema or game rules migration is involved.
