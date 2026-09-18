# Player feedback revision — 2026-09-07

## Outcome
Make the game recognizable and readable as a space board game, with symbols for
at-a-glance decisions and complete selected-sector information; publish this
revision on the existing Vercel site using the explicitly requested Convex
**development** deployment `ideal-nightingale-55`.

## Actual user findings (human review, not automated usability claims)
- Galaxy felt crowded and hard to parse; insufficient resemblance to a physical board.
- Overall aesthetic felt like corporate spreadsheets rather than an interesting space game.
- Research and upgrades did not explain effects; adding repeated prose was also rejected.
- Desired visual shorthand: Gluon Computer should immediately communicate +3 computer.
- Wormhole/warp lines appeared incorrect.
- Planet resource types and advanced spaces were missing from sector details.
- Running score was not visible.

## Accepted design changes
- Original atmospheric artwork, tactile sector faces, varied planets, ship silhouettes,
  numbered ownership discs, restrained bronze UI surfaces.
- Civilization ribbon replaces the permanent left sidebar; one inspector remains.
- Territory-focused default zoom, whole-galaxy Fit, drag navigation, minimap.
- Wormhole openings, paired usable bridges, and warp portals are distinct. Existing
  engine edge orientation is verified by every edge/rotation pair; no speculative
  rule change was made.
- Technology and part cards lead with consistent SVG stat icons and large values;
  prose is secondary, accessible through selection/details. Four technology tracks
  are visible side by side on desktop.
- Planet inspector must enumerate every printed square, including resource, advanced
  requirement, occupancy and legal colony options. No reduction to population count.
- Running points must distinguish known own total from opponent public points;
  hidden reputation may not leak.

## Artwork provenance
Built-in imagegen used, via `/Users/oblet/.codex/skills/.system/imagegen/SKILL.md`.
Saved asset: `public/second-dawn/galaxy-atmosphere.png`.
Prompt: original wide painterly space-game background, quiet black-indigo vista,
bronze/teal nebula, fine stars, shadowed ringed planet clipping lower-right corner,
large dark negative space for interactive tiles, no text/UI/logos/grids/spacecraft.
The generated image was inspected before integration. Planets, game symbols and
ships are original native SVG so their meaning and state remain deterministic.

## Verification
- Behavioral red/green logs for research explanation and icon-first revision.
- 36 edge/rotation cases, zoom detail and non-adjacent portal rendering tests.
- Upgrade effects, visual stats, selected-part explanation, legal draft tests.
- Planet enumeration/advanced requirements and privacy-preserving scores added next.
- Old screenshot baselines deliberately remain unchanged: they no longer represent
  the user-approved direction. Revised captures are reviewed separately before any
  future baseline adoption.
- Record new screenshots and deployed browser smoke results here when complete.

## Rollback
UI changes are separate from rule state and do not rewrite existing matches.
Vercel previous Ready production deployment:
`https://eclipse-rougelike-ev2da3mq1-obleton-adrian.vercel.app`.
The prior production backend `greedy-mongoose-499` remains untouched. New frontend
release targets `https://ideal-nightingale-55.convex.cloud`, as the user requested.

## Preview route correction
The user's later report identified a real integration mistake: the public
`#second-dawn-preview` still rendered the separate early prototype, while the
current live UI was only visible in matches and `#second-dawn-review`.
Both preview/review URLs now render `SecondDawnReview`: deterministic recorded
`GameState` fixtures -> `getPlayerView` -> the SAME `SecondDawnBoard` component used
by Convex matches. Commands in fixtures use the real `processGameCommand`.
The early prototype is explicitly archived at `#second-dawn-design-archive` and
is no longer linked as the preview. Visual acceptance tooling now navigates the
public preview URL, preventing this route mismatch from recurring. A failing-first
route test verifies the preview shows the engine fixture controls and current map.

## Publication preference
User explicitly asked to keep updates pushed to the preview page. Subsequent
verified UI revisions should be deployed to the existing Vercel project so its
stable `#second-dawn-preview` URL stays current. The deployment uses the explicitly
requested development backend; fixtures themselves remain isolated and unsaved.

## Completed verification and release
All requested concrete revisions are implemented, including selectable ship classes
with retained drafts, icon-first loadouts, full planet spaces, public running VP,
private reputation, visible ambassadors, opponent public inspection, and a
pre-confirmation traitor warning at the correct end-of-action timing.

- 271 game tests passed; preview routing subsequently covered by 3 passing tests.
- 19 real-engine browser action tasks passed.
- 18 additional feedback-specific screens/workflows at all three desktop sizes passed.
- Independent reviewer inspected 21 primary screenshots, reported four defects,
  and confirmed their correction: `second_dawn_revision_visual_review.md`.
- Explicit v2 baselines established only after review; fresh capture matches all21.
  Original baselines preserved. No claim of human aesthetic acceptance.
- Cloud save/resume/reconnect/pending-exploration and scheduled AI verified live;
  see `second_dawn_deployment_live/smoke.json`.
- Public preview and live game deployed; details in `second_dawn_deployment.md`.

## Visual choices follow-up — 2026-09-07

Human feedback: exploration needs a visual rotation/connection preview; planet occupancy and advanced spaces should be visual; a discovery choice must reveal its reward before acceptance.

Implemented shared live/preview components: ExplorationDecision draws the real neighboring sectors and wormholes, offers left/right rotation, checks each connection, and enables placement only for saved legal placements. Draco retains both committed draws and can inspect either. SectorPlanets now uses owner-colored cubes, open slots and advanced stars with accessible explanations. DiscoveryDecision shows the actual catalog name, resource/ship-part/structure stats, effect explanation and 2 VP alternative, with native radio selection and explicit confirmation. No rule or persistence changes.

Failing-first tests recorded in logs/second_dawn_exploration_visual_red.out and logs/second_dawn_discovery_integration_red.out; component agents record their own red/green results. Final game batch: 290 tests / 49 files pass; changed-code lint and production build pass. Repository lint remains inherited 88 errors / 12 warnings.

Independent browser review found exploration confirmation below the visible workspace at 1366 and 1440. Fixed by placing verdict and commitment beside the diagram, retaining rotation below the diagram and scrolling secondary connection details. The repeat review passed 36 combinations across two real engine fixtures, six rotations, and all three target sizes; keyboard focus and clipping ancestors are checked in tools/second-dawn-exploration-review.mjs. Evidence: second_dawn_exploration_independent_review/review.md. Planet inspector reviewed at all three sizes; six spaces plus shared legend fit at 1366. Exactly three existing midgame baseline images changed, reviewed and explicitly replaced; the other 18 remained identical. These are agent visual reviews; the user feedback above is the human evidence, not a claimed new human playtest.

The preview now includes exploration and discovery positions captured from the same deterministic engine playthrough as existing fixtures. They run through the same command processor and board components as guest games.

## Stage preview, fleets, and discovered-part placement

Additional human requests: show the board through the game and active combat, include Ancient encounters, make ancient-part installation a blueprint choice showing the replaced component, and use ship images/counts in the sector inspector.

Added visible Opening / Round 4 / Round 8 / Active combat / Ancients shortcuts and shareable `?position=...#second-dawn-preview` links. Additional Ancient positions come from the same 841-command seed-106 engine playthrough: explored sector 204 with one Ancient, surviving Ancient fleet, and round-6 battle in sector 303 against an Ancient. No illustrative state format was introduced.

BattleOverview groups engaged fleets on attacker/defender sides with ship silhouettes, counts, public combat stats and detailed damage. SectorFleet groups by owner/type with an image and count, retaining individual damage details. Ancients, Guardians and GCDS use distinct original SVG silhouettes. Discovery installation now selects a ship class and actual current blueprint slot; it shows the replaced part and changed ship statistics before submitting the exact legal command. Permanent outside-grid installation and storage remain explicit choices.

Browser review found excess inherited battle-card spacing and vertically stacked dice pushed combat confirmation below the 1366 viewport. Fixed fleet-card margins, used a bounded two-column dice list, and kept confirmation outside its scroll area. Visual part installation also needed a compact changed-stat preview to keep confirmation visible; full stats remain expandable. Fleet/planet inspector heading spacing was reduced to retain six visible planet spaces with the new fleet card. Agent scripts cover these real workflows; this is not additional human playtest evidence.

### Economy, direct actions, and board ownership follow-through

All current feedback is implemented: owned research tiles, science-icon prices, scrollable public action journal, current/next-action upkeep previews, visual trading, atomic warned research/build conversions, direct turn buttons, quieter sector IDs and colored territory fills, build-order popup, and ship-first movement with reachable target rings. All screens use the same production Board and public PlayerView; review positions are real engine fixture states and do not maintain separate demo UI implementations.

The Build order uses faction construction prices, technology requirements, deployed supply and remaining activations. It commits one command for all selected components. The Move planner uses public blueprints and shared movement validation, including pinning and Improved Logistics. Conversion never submits a preliminary trade: rejected purchases leave the game unchanged.

Validation: 353 passing tests across 69 files, changed-code lint/build clean, reviewed v4 screenshot baseline (21/21 match), eleven action walkthroughs, live creation/resume/reconnect and AI public history. Detailed new reviews: `second_dawn_build_planner_review.md`, `second_dawn_movement_planner.md`, `second_dawn_atomic_funding_review.md`, `second_dawn_history_backend_review.md`, `second_dawn_revision_visual_review.md`. Existing whole-repository lint debt stays 88 errors/12 warnings. No human playtest findings are claimed beyond the user's supplied feedback.
