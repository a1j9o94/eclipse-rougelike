# Visual fleet intelligence — 2026-09-19

## Player outcome and acceptance

Players can inspect a fleet as recognizable faction ship blueprints, identify the effective installed parts and weapon effects, see damage on individual ships, and compare their selected moving ships without losing the movement draft.

Acceptance: one loadout per owner/ship class; printed, installed, empty and outside-grid parts rendered from the same catalog used by the blueprint editor; icon-based total capabilities; per-ship remaining-HP pips; accessible attack-face comparisons; no private information; keyboard dismissal/focus containment; readable desktop/mobile layouts with a persistent return control.

## Implementation

- `FleetInspection.tsx` groups ships by public owner and class. Faction emblems, original ship silhouettes, faction-colored outlines and counts identify each class. Every ship retains a separate condition marker with filled HP pips and crossed-out damage pips.
- Reusable `BlueprintLoadout.tsx` renders effective modules from `effectiveBlueprintParts`, including revealed printed modules, replacements and outside-grid parts. It uses existing `ShipPartStats` icons and catalog names; the tiles are read-only. Permanent blueprint bonuses are explicitly separated from installed modules.
- `ShipCapabilities` shows aggregate HP, initiative, computer, shield, movement and energy used/produced. Neutral defenders use their public printed statistics and weapon icons; no fictional module loadout is invented for them.
- Selected own ships have the same visual loadout cards. Matchup cards highlight which die faces hit in each direction and show relative initiative. Detailed natural-roll/phase rules are available in a disclosure. Initiative wording avoids implying a cannon fires before an opponent's missiles.
- Public technologies and diplomatic controls remain accessible below the cards. Input is still strictly `PlayerView`; no engine state or private reputation is read. Closing inspection does not submit a command or modify an action draft.
- Responsive CSS uses two desktop class columns and one mobile column, with four/two module columns. Return to plan remains visible in the sticky dialog header. Single-class inspections use a narrower dialog.

## Test evidence

Two new behavior tests failed against the old UI before implementation (`coding_agents/logs/fleet_intelligence_red.out`). The final six-test component batch passes, covering grouped effective loadouts, +3 Gluon Computer icons, printed module replacement, outside-grid Muon Source, empty slots, selected-own filtering, neutral damage, natural hit faces, focus containment and Escape.

Final integrated targeted batch: 12 tests passed across fleet inspection, retired-route fallthrough, shared preview routes and the current-only launcher. Full repository lint is clean. `npm run build:vercel` passes TypeScript, domain typecheck and production bundling. The earlier complete `npm run build` including Convex codegen passed as part of legacy cleanup. Logs are under `coding_agents/logs/fleet_intelligence_*`.

## Rendered review and walkthrough

`node tools/second-dawn-fleet-intelligence-review.mjs` opens the real shared preview Board, inspects the recorded late-game Hydran fleet, selects an Eridani Interceptor for movement, compares it against that fleet, and returns to the unchanged movement draft. It also opens an Ancient defender inspection from the recorded Ancient fixture.

Screenshots and measured results are in `coding_agents/second_dawn_visual_fleet_intelligence_review/`:

- 1366×768, 1440×900 and 1920×1080 desktop: late fleet and selected-fleet comparison.
- 390×844 and 360×800 mobile: late fleet and comparison.
- 1440×900 Ancient defender.

All five viewport walkthroughs report no dialog horizontal overflow, no comparison overflow, no browser page errors, a reachable return control after scrolling, and preserved movement selection. The Ancient view contains one silhouette and no invented component grid.

Actual rendered desktop, mobile, comparison and Ancient images were reviewed. Fixes made during that review: stronger heading specificity against global styles, balanced mobile capability rows, opaque sticky header, single-class dialog width and scroll padding below the header. Ship class cards no longer artificially stretch to match a taller neighboring blueprint.

These are developer image review and automated task walkthroughs, not independent human playtests. The screenshot files are review artifacts, not automatically accepted visual baselines. No user playtest claim is made.

## Risks and rollback

No rules, costs, combat outcome logic, commands or backend schemas change. Combat odds are not estimated; highlighted faces use public computers/shields and the existing natural-roll helper. Multi-owner sectors retain separate owner/class groups. Rollback is limited to the fleet inspection component, new read-only component/styles and their tests/tooling.
