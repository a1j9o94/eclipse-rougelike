# Science-fiction faction first release

Outcome: players can choose seven experimental factions, use their abilities through the normal interface, and resume or play against AI without losing private choices or changing existing faction rosters.

The opt-in `scifi-v1` collection includes the existing 18 factions and seven new factions, with separate rule/catalog pins. The existing default remains `expanded-v2`. This first release requires Standard inventories and faction rules. Culture remains held; Mars is not included.

| Faction | Implemented first version |
| --- | --- |
| Merry Band of Pirates (ExFor) | Wormhole Generator; private draw-three/keep-two discovery draft, then ordinary discovery resolution. Reduced starting economy: 2 materials, 2 science, 3 money; no home materials cube. |
| Replicant Commonwealth (Bobiverse) | One materials population cube per interceptor, loaded with a colony ship in a controlled sector. Normal production track and firing-side target allocation. Supply of 9 interceptors, 5 cruisers, 3 dreadnoughts; ordinary starting interceptor. |
| Trisolaran Civilization | After Research, reserve one physical market tile once per round. Reservation expires at next own turn or round end. Blocks market acquisition and free technology, permits Portiid copying. |
| Portiid Collective | A participating survivor, including retreat, can record one observed technology or installed Ancient part. Research copies technology at ordinary discounted cost without consuming market supply; fabricates a physical Ancient part for 6 science. One fabricated copy per named part per game, ordinary install/store/remove rules. |
| Spacing Guild | Once per round prospect a legal outer frontier beside any sector. One home portal and two permanent deployable portal markers; global network. Guild ships cannot pin foreign ships. Foreign paid network travel costs 1 money per ship per Move action, ordinary adjacency is free. Escrow-backed, partial-fill, 1:1 player resource offers expire before upkeep. |
| Formic Hive | Starts with one cruiser. On normal Move actions, a cruiser may escort up to two interceptors, a dreadnought up to two cruisers along the same legal path; one activation, no recursion. Reactions move one ship. |
| Belt Confederation | A participating survivor, including retreat, collects 1 material for every wreck in the entire sector battle, capped at 3. Friendly and neutral wrecks included, no historical wrecks or duplicate payouts. |

All seven use ordinary blueprints and normal scoring initially. Other than ExFor and Formics, starting resources are 4 materials, 3 science, 3 money. Physical board colors remain independently selected. Home artwork is reused, with unique sector instance IDs when home tiles repeat.

## Acceptance and evidence

Fail-first suites cover historical roster preservation, Standard-only guard, private discovery draft, reserve supplies, factory cube lifecycle, enemy target allocation, surviving retreat, complete-battle salvage, reverse engineering, convoy pinning/range/reactions, remote prospecting, paid portals, atomic escrow, expiration, and new AI choice legality. UI tests cover faction opt-in and decision controls. Existing engine, protocol, AI, movement, ancient component, discovery and multiplayer regressions remain release gates.

Save/replay uses persisted choices and finite discovery draws. Public views expose offers and reservations; private draft identities remain visible only to the owner. Existing saved games retain their optional-field compatibility and original roster/version pins.

## Tuning and rollback

These are experimental starting values, not a claim of tournament balance. Tune initial economy, Ancient part cost, salvage cap, portal toll and marker count after playtesting. Keep one named Ancient replica per game until evidence supports repeat fabrication. Disable selection of `scifi-v1` to roll back new matches while retaining validators/reducers for existing saves.

## Release

Run relevant tests with one worker, lint, and the full build. The existing main-only Git build verifies the established target and publishes the backward-compatible Convex backend to `dev:ideal-nightingale-55` before compiling/releasing the frontend, using the existing Vercel secret. This replaces the manual-before-push dependency when the local session lacks Convex credentials. Verify the Git-triggered Vercel deployment and canonical URL. Deployment credentials are never included in source or evidence.

## Completed release gates — October 9, 2026

- 70 tests pass in the final six-suite faction/build-planner batch, including 62 faction-specific tests and two complete six-seat AI smoke matches.
- 72 catalog/protocol/AI regressions and 31 Convex match/room/draft regressions pass in bounded batches. Battle/action/movement/discovery regressions were also verified by their implementation owners.
- 12 release-target tests pass, including three fail-first checks of the actual backend publish entry point.
- Full repository lint, Convex API generation, TypeScript, Eclipse typechecking and Vite production build pass. Existing Vite bundle-size advisory remains.
- Local real-backend browser publishing is blocked by this execution environment rejecting the Node executor Unix socket (`listen EPERM`). The corresponding real Convex mutation/query flows pass under convex-test. Live browser verification follows the authorized Git release.
- The user explicitly authorized pushing to main after tests pass. Existing Vercel Production target metadata was verified against the required development backend; the sensitive key remains inside Vercel.

## Live release verification

Main commit `8b87eed45f81b9ebd5dcdebc46467c773472ad48` produced Vercel deployment `dpl_FdZkVst6ppNJKLUBbu8SVyWJKFBL`, verified Ready. The canonical application at https://eclipse-rougelike.vercel.app/ exposes the optional Science fiction collection with all seven new factions.

Real browser checks against the deployed application confirmed:

- Bobiverse: loading an interceptor factory increases materials income from 3 to 4; the factory marker and income persist after reload.
- ExFor: the same three private discoveries persist after reload. Keeping two and resolving the ordinary rewards applies the chosen materials/VP rewards and resumes the turn.
- Guild: home portal and remote prospecting destinations appear; posting one material for one science reduces available materials from 4 to 3. The offer and escrow survive reload, and cancellation restores materials to 4.

The browser check also identified cramped Guild exchange controls. The follow-up styles give the offer form labeled, spaced controls and a full-width heading. The unused local browser smoke experiment was removed because this environment cannot run its backend executor; the checked-in reducer, UI, Convex, AI and release tests remain the automated verification path.
