# Research: visible prices and civilization-board rows

## Outcome

A player can see a technology's printed base cost, minimum cost, discount and actual science payment directly on its card. Selecting a card retains these quantities. Owned technologies read left-to-right within each of the three research tracks.

## Acceptance and decisions

- Compact Base / Minimum / Discount numbers precede the science-icon payment; no new explanatory paragraphs.
- A rare technology shows its lowest eligible price until a track is chosen; the selected track's exact discount and price replace that preview. All calculations use `researchCostForSeat`, including Minor Species; the component never recalculates game prices.
- When a discount reaches the tile's floor, a short `Minimum price reached` label explains why a further discount does not reduce payment.
- The existing in-card confirmation, funding options, effect icons, accessibility labels and selection focus remain.
- Owned technologies use three full-width rows. On desktop each row places the shared `ResearchDiscountTrack` beside horizontal technology cards; mobile wraps tiles below the strip. The whole researched section remains collapsible.
- No engine/rules changes. Rollback is limited to research presentation and its styles.

## Verification

- Two new behavioral tests failed before implementation: printed-price disclosure and preserved selected-card breakdown with differing rare-track discounts, Minor Species and the minimum floor.
- **23 tests passed** in six research suites: price clarity, cost, workspace, owned technologies, discount progression and market order. Log `/tmp/research-price-green.log`.
- Scoped ESLint, application TypeScript (`tsc --noEmit -p tsconfig.app.json`) and `git diff --check` passed.
- Used an ignored `.second-dawn/` local harness after the product preview route was removed; it mounts the real production components with deterministic engine-derived views. No replacement product preview route was introduced.
- Actual PNGs inspected at 1440×900 and 390×844: `screenshots/player-feedback-research/`. Reviewed desktop/mobile ownership rows and a selected rare card. Costs stay legible and present; no clipped controls or horizontal page overflow observed. No browser runtime errors in the final harness session.
- React review: costs derive from props with no synchronization state; authoritative helpers remain the only price source; existing buttons, focus and named costs remain accessible. Tests verify rules-facing quantities separately from visual review.

## Follow-ups

Root owns full repository lint/build and deployment. These are agent browser reviews, not a new human playtest.
