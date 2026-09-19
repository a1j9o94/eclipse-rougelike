# Advanced technology population opportunity — September 18, 2026

## Outcome and acceptance
Research cards show an icon and count of eligible empty advanced planets in the viewer's controlled sectors. Selecting Labs, Economy, Mining, or Metasynthesis shows newly enabled resource options and the maximum population supported by current colony ships and cubes. Owned cards retain an updated count of unfilled opportunities.

## Decisions
- Read only public PlayerView and catalog data; no changes to commands, rules, persistence, or faction abilities.
- Count printed advanced squares only, excluding occupied/foreign/uncontrolled squares and orbitals. Gray planets count once and support the technology's resource.
- Separate geographic opportunities from current supplies and turn legality. Count persists when inspecting off-turn. Current supply capacity fills resource-specific squares before flexible gray squares.
- Prior technologies can make the opportunity already unlocked. Metasynthesis counts physical squares once, while describing any new resource options accurately.
- Cube availability comes from the existing colonization preview, including tracks at minus one.

## Verification
- First test run failed because the opportunity helper did not exist; implemented helper and UI, then 8 focused tests passed.
- Research workspace, researched tiles, readability, and colonization preview regressions passed (14 additional tests).
- Production build passed; changed-file ESLint passed. Repository lint remains at its prior 88 errors and 12 warnings.
- Deterministic midgame browser review: market Advanced Labs reports 2 empty planets; detail reports 2 population capacity with 3 colony ships and 9 science cubes. Captured and inspected 1366×768, 1440×900, 1920×1080 and 390×844 screenshots in second_dawn_advanced_planets_review. No horizontal overflow; resource/star/count readable; detail and conversion controls remain scrollable on smaller screens.
- Full bounded Second Dawn suite: 621 tests passed across 125 files. Final build and changed-file lint passed after integrating automatic drafts without acknowledgement.
- Visual review caught and fixed a inherited market typography override shrinking the counter; selecting research now scrolls to its header so the benefit is immediately visible. Repeatable browser check: `node tools/second-dawn-advanced-research-review.mjs`.
- Engineering visual review only; no new human playtest evidence claimed.

## Risks and rollback
Presentation-only change. A supply forecast is conditional on acquisition and subsequent legal colonization; it does not submit placements. Revert the isolated preview/helper and integration if needed.

## Follow-ups
None required for the requested feature. Deployment evidence will be recorded after the accompanying draft-review fix passes validation.
