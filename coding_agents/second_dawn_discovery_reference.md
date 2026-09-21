# Command Center discovery reference — 2026-09-20

## Outcome

Less Random players can inspect every discovery tile reward and its remaining public copies from Command Center before earning a discovery.

## Acceptance criteria

- A discoverable, collapsible section follows current reputation and colony supply.
- All distinct types in the canonical Less Random forty-tile inventory appear once, with current public stock counts. Unavailable types remain inspectable.
- Search supports tile names and reward effects; ship parts display canonical statistics, including revised Less Random missiles.
- Reward copy includes resource quantities, single-type resource choices, free-technology requirements, placement effects, scoring bonuses, and install/store behavior.
- Browsing is read-only, available while inspecting either empire, and absent in Standard mode or when Less Random public data is unavailable.
- Cards stack on narrow displays and controls expose accessible names and expanded state.

## Test list and evidence

- **Fail first:** Command Center opener, canonical complete inventory and counts, search without state mutation, depleted supply inspection, live stock updates. Initial focused run: 3 expected failures for absent opener, 1 Standard/missing-data guard passed.
- Implementation run: `npm run test:run -- src/__tests__/second_dawn_discovery_reference.spec.tsx src/__tests__/second_dawn_empire_overview.spec.tsx src/__tests__/second_dawn_less_random_discovery_ui.spec.tsx` — 18 tests passed across 3 files.
- Focused ESLint passed for new component/tests and EmpireOverview.
- Supervisor owns repository lint/build gates and responsive browser verification.

## Decision log

- Derive types from `createLessRandomDiscoverySupply()` and details from `getDiscovery()`, rather than exposing Standard-only portal or Rift tiles or obsolete missile versions.
- Read counts only from `PlayerView.lessRandom.discoverySupply`. Do not infer private holdings or read a hidden Standard deck.
- Keep exhausted/reserved tiles labeled “Unavailable”; counts describe remaining supply, not current effect legality.
- The resource-choice engine queues one choice with the full amount. Copy therefore says “resources of one type,” rather than suggesting arbitrary splitting.
- Use the existing `ShipPartStats` renderer and `describeShipPart` search text. No engine, catalog, or command changes.
- Review using the React best-practices skill: explicit typed boundary, derived stock/filter values, stable tile keys, no effects, proper controlled search and accessible toggle. Sanitize the generated content ID for compatibility with the test DOM's existing `:has` selector handling.

## Risks and rollback

Reference wording could drift if acquisition rules change; canonical inventory and stat reuse reduce that exposure. The feature is isolated to one component, stylesheet, and two integration lines, so rollback leaves game state and saved matches unchanged.

## Result and next steps

Implementation and focused regressions passed. Supervisor will record final browser, lint, and build results with the combined UX update.
