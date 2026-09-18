# Visual fleet movement

Outcome: choose a departure sector on the galaxy, select ship cards, click a highlighted destination, review routes and upkeep, and submit one authoritative move command.

The new `MovementPlanner.tsx` takes the agreed public-view/source/target callbacks. Its pure `movementPlan` helper derives range from public blueprints and validates routes using the shared geometry rules. Breadth-first search visits each sector at most once per ship; permutations of up to four selected ships account for sequential pinning changes. Each ship relocates before the next route is checked, matching the authoritative command processor. Wormhole Generator, warp portals, Cloaking Device and Draco use existing rules; no unverified Jump Drive behavior was added to the base catalog.

Activation limits come from the shared capacity helper, including Improved Logistics and one-activation reactions. Open actions use their remaining activations. Cards explain stationary starbases, missing drives and pinned fleets. The selection cannot exceed the number of ships permitted to leave. Destination confirmation shows one path per ship and projects upkeep via the shared command preview. Selection does not commit a command.

Seven focused tests pass: multi-ship authoritative acceptance, leaving a ship behind to pin an enemy, card selection/map destination/one confirmation, immobile starbase explanation, reaction/open-action capacity, pending-decision exclusion, and Improved Logistics. Tests initially failed before component implementation; the Logistics regression independently failed before replacing duplicated capacity logic. Focused ESLint and application TypeScript pass. Root owns board wiring, target highlights and final rendered movement walkthroughs.
