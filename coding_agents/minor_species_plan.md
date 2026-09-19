# Minor Species — implementation plan

## Outcome and acceptance

Players can opt into the official Second Dawn Minor Species expansion for solo or multiplayer games, buy visual ambassador tiles during their turns, and immediately receive the correct benefits. Four distinct tiles from the nine-tile catalog are seeded at setup. Owned tiles, costs, track space, income, discounts, AI decisions and final scoring must agree with the authoritative engine.

## Source

Publisher rules: https://www.lautapelit.fi/files/Online%20rules/Eclipse2_MS_rules_web.pdf
Both printed effects and pictured prices reviewed. Functional labels are descriptive UI names; the physical tiles are unnamed.

| Tile effect | Money | VP |
|---|---:|---:|
| Per reputation tile | 8 | 1 per tile |
| Per ambassador, including itself | 4 | 1 per tile |
| Prestige | 8 | 3 |
| Population cube from chosen track | 9 | 1 |
| Cruiser −1 materials | 4 | 1 |
| Dreadnought −2 materials | 4 | 1 |
| Orbital −1 materials | 4 | 1 |
| Monolith −2 materials | 6 | 1 |
| Research −1 science, printed minimum applies | 4 | 1 |

## Delivery

- Engine agent: finite seeded catalog, optional state, purchase validation, atomic private reputation return, population/discounts/slots/scoring and replay tests.
- UI agent: visual market and owned cards, purchase/slot warning, same authoritative pricing in research/build, public scoring.
- Setup agent: solo/room checkbox, persisted agreement, schema/command validators, version compatibility and Convex tests.
- Root: fair AI evaluation/sampling, public history, integration, browser review and release.

Fail-first tests cover new behavior. Run memory-bounded related batches, full lint/typecheck/build. Browser-check 1440×900 and 390×844 purchase flow and disabled reasons. No human playtest claim.

## Risks and rollback

Optional module defaults off; existing saves and setup seeds stay unchanged. Purchased tiles cannot be discarded. Reputation values remain private even when returned to make space. New matches pin the module version. A rollback must preserve support for saved enabled matches; disable creation before reverting engine support.

## Priority exception

User requested command-center discount reuse first. Isolated frontend commit 7a73bd1 was pushed to main and Vercel reached Ready before Minor Species release.

## Decisions and current verification

- Traits follow the base prohibition on forming diplomatic relations while holding the traitor tile. The Minor Species supplement makes no exception.
- Orion has four mixed spaces and one reputation-only space; its dedicated reputation slot is now explicit. No Minor Species may occupy that slot.
- Public bonus VP uses reputation tile counts, never their hidden values. Gold purchases that require freeing a mixed space return the selected private reputation tile atomically with the purchase.
- Root tests observed five failures before implementation (AI world projection, policy, public scoring and history). Six new AI tests now pass, together with thirteen existing strategic-search tests. Sampling retains only the public market/ownership; hidden-state changes do not alter the bounded result.
- Five seeded Normal-AI matches (2–6 seats) reach round-eight scoring with finite-market conservation. Three of these five seeds purchase allies; buying in every seed is not a requirement because resources and opportunity costs vary. The suite checks that some purchases happen and that all acquired tiles remain accounted for.

## Final integration verification

- Final expansion unit/integration batch:34 tests passed across engine, AI, Convex validators, UI and previews. Additional five full-match seeds reached scoring at every supported seat count; related base funding/diplomacy/protocol/history/faction regression batch48 passed. Setup/lobby tests and UI walkthrough evidence are linked in the accompanying validation documents.
- Independent review found a misleading dedicated ambassador-space illustration; corrected and covered by a regression. No other reported engine/privacy/undo/cost blockers.
- Full lint, TypeScript and production build passed. Existing Browserslist age and bundle-size warnings remain.
- Convex development ideal-nightingale-55 deployed successfully. CLI reported account usage above Free plan limits; deployment itself succeeded.
- User confirmed upkeep counting was correct. Added money surplus/shortfall forecasts and read-only research access during upkeep; see upkeep_balance_and_research.md.
