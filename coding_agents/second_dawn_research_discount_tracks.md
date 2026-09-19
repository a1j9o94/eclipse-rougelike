# Research discount progression

## Outcome

The Research page shows the entire science-discount progression for Military, Grid and Nano above their existing owned technologies. Each track states the current reduction, the reduction after one more purchase, and whether the next purchase fills the seven-slot track. Full tracks explicitly say no slots remain. Prices remain capped at each technology's printed minimum.

## Implementation and acceptance

- `ResearchDiscountTrack.tsx` reads `RESEARCH_DISCOUNTS` and `RESEARCH_TRACK_CAPACITY` from the authoritative [technology catalog](../shared/eclipse/technologies.ts). No second table or rules change.
- Actual owned placements determine the count, including starting technologies and rare tiles placed in that track.
- All seven purchase discounts remain visible. Text and a bordered current marker identify progression without relying on color; completed tracks show no misleading current purchase marker.
- Existing technology effects, inspectors, and local research confirmation stay intact. Mobile uses one column so seven discount cells remain legible.

## Validation

Three new cases failed before the UI existed, then passed: full progressions and actual chosen-track counts; six-owned discount/last slot; full-track blocking. Together with owned research and workspace tests, 17 focused tests passed. Scoped ESLint, TypeScript and diff checks passed.

Actual preview opening route, Research action, at [1440×900 desktop](screenshots/research-discounts/desktop.png) and [390×844 mobile](screenshots/research-discounts/mobile.png). Both saved images opened and reviewed: current marker, all seven values and next-discount text fit without clipping. Mobile scrolls between the existing technology groups. No human playtest claimed.

Parent handles combined gates and main release. Rollback removes the presentation component and CSS; no persistence migration or price calculation changes.

## Available market ordering follow-up

Available tiles in each Military/Grid/Nano/Rare group now sort by their current displayed science cost, then printed base cost and name for stable ties. When no eligible track remains, base cost provides a stable fallback. Grouped duplicate counts, selected-card confirmations and the randomized supply order are unchanged.

A shuffled-market regression failed before implementation and now verifies all four groups, duplicates, unchanged input state and consistent order after reversing the public market array. The combined order/discount/workspace batch passes 14 tests. Desktop and mobile research market screenshots under `screenshots/research-order` were opened and reviewed; no browser console errors. Full lint and production build passed (existing bundle-size and Browserslist warnings only).
