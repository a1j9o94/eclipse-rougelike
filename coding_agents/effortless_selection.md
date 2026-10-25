# Effortless choices: research, economy, rewards and faction previews

Outcome: players can replace an uncommitted choice directly, keep compatible inputs, and see exactly what the one commit control will submit.

The user-supplied October 25 plan supersedes the earlier iteration brief. Existing commands, rules, randomness, private views and save formats remain authoritative. Work is on `feature/effortless-ux`.

## Delivered behavior

- Research A → B → C replaces the purchase immediately. Unavailable cards clear the previous purchase. Compatible rare tracks and explicit funding sources survive replacement; an incompatible payment remains visible and blocked until corrected. Owned technology inspection, including an owned market copy, leaves the active purchase intact.
- Research leads with opportunities and keeps owned tracks collapsed and inspectable. Developments, Quantum placement and Shrines now stage an editable preview before commitment. Quantum placement has the actual reduced science cost and names its destination.
- Free technology uses `ResearchWorkspace` in reward mode, with the same technology content, selection presentation and track controls. A sole legal track is shown as a fixed preview; competing tracks remain deliberate.
- Shrines use a three-by-three track with costs, placed status and row rewards. The selected track space exposes eligible sectors and real `SectorPlanets` choices. A selected planet receives a Shrine ghost before the explicit placement commit.
- Trade keeps the requested quantity when either resource changes. The UI identifies unavailable increments, same-resource exchanges and exact shortages instead of silently resetting quantity or changing payment. Guild and bank exchanges share resource choice controls. Guild partial fills retain their requested quantity after stock changes and disable an unavailable fill.
- Influence retains an explicit source while destinations change. Incompatible sources stay visible with an explicit correction. Players can select a transfer source on the same map, preserving the destination.
- Colonization places a sole legal cube immediately, exposes a picker only for flexible destinations, and uses an explicit Remove control. Revisiting a planned planet does not remove it. Invalid placements can be removed individually, preserving the rest of the batch. Colony ship and population shortages identify the actual quantities.
- Resource rewards and population returns support direct quantity entry and Put remaining here. Forced return destinations are prefilled. Invalid totals cannot serialize a submitted allocation.
- Faction conversions, factory loading, Guild portal placement, reverse engineering and paid activations show a persistent explicit preview before commitment. Factory objects use readable ship identity and silhouettes instead of raw IDs.
- Full discovery trays support replacing a selected slot while preserving other physical instances, including duplicate discoveries.
- Diplomacy offers and responses share `DiplomacyExchangePreview`, preserve invalid resource choices visibly and show cube direction, income, rack space and VP. Diplomacy/Minor Species overview work and the initial selected-only species/actual-reputation-tile changes were handed to the fitting agent for completion.
- Normal commit controls use the shared queue label when planning off-turn.

## Verification

Initial eight selection/reconsideration regressions failed before implementation. Eight additional exception regressions also failed before implementation. Development/Quantum and owned-market inspection regressions failed before their fixes. The Shrine test initially exposed a fixture color collision; correcting the fixture then verified the new spatial flow.

Bounded runs, one worker each:

- 7 research/selection/funding/ownership/influence/colonization suites: 52 passed before reward-mode extraction and the Shrine view.
- 7 reconsideration/economy/faction/Scifi/diplomacy suites: 52 passed.
- 5 reconsideration/trade/Guild/Scifi suites: 38 passed, including exact payment preservation and correction.
- Influence source-map and selection suites: 25 passed.
- Final reward-mode/Shrine/selection/exception/economy batch: 27 passed.
- Final decisions/Scifi/draft revalidation/trade/sector planet/advanced art batch: 41 passed after adding the optional planet selection mode.
- Changed TypeScript/TSX files passed ESLint. The React best-practices skill was applied to component boundaries, event-driven selection, labels, focus, state derivation and shared primitives.

These counts overlap; they are evidence for bounded checks, not a cumulative unique test count. The supervisor owns repository-wide lint/build/release gates and desktop/mobile browser evidence.

## Decisions and risks

No new engine commands or strategic substitutions were introduced. Candidates and current public balances determine legal previews; the existing processor revalidates submissions. Private decision choices and reputation values are not added to browser draft storage. Public faction previews use the supervisor's strictly validated `factionDraft` key. Private decision children remain keyed by decision identity inside the stable outer activity.

The ordinary research purchase and reward mode share their workspace and tile primitives while retaining different payment/eligibility contracts. A reward never reuses an ordinary paid research command. SectorPlanets selection is optional; read-only and spectator uses retain their existing interface.

## Integration and follow-up boundaries

Map and faction integration is completed below. Human newcomer/expert playtests and physical-device ergonomics cannot be certified by component tests. Context continuity, commands received once, remote rejection and background automation are integrated and verified by the supervisor and combat agent.

Result: all implemented previews remain editable until a specific commit. Reverting this UI slice restores prior presentation without requiring saved-game migration.


## Map and supporting activity completion

Added dashed planned influence discs for placement and withdrawal and ghost population cubes on their exact printed planet or Orbital. Both normal and forced colonization use the shared galaxy; public ownership and population remain unchanged until the server accepts a command. Spectator views never render these private preview props. Switching activities shows the corresponding saved draft.

Factory and portal selection now lives beside the selected sector fleet and inside fleet inspection, using the same persisted faction draft and explicit commit. A missing selected object remains visible as an invalid preview with its commit disabled. Off-turn factory loading, portal placement, reverse engineering and activation purchase show exact unsupported-queue reasons; no attempted commit silently disappears. Resuming the faction activity hides the inactive core commit while retaining that core draft for later resumption.

The activity dock maps Diplomacy, Recruitment, Guild exchange and Faction drafts separately, with dedicated resume routes and local reset keys. Guild configuration edits now count as meaningful drafts. Reset also clears dependent configuration/focus while preserving the open activity; supporting resource preferences alone do not create a phantom unfinished activity after an accepted purchase/offer. Mobile tabs scroll in one row with short visible Reset and Undo controls and complete accessible labels. ExplorationDecision whitespace was removed.

Verification: six initial map/activity regressions failed before implementation, then passed. Fleet-inspection entry, forced colony ghosts, removed-object retention and inactive Explore commit regressions also failed before their fixes. All four unsupported faction queue variants have coverage. The bounded related batch passed 53 tests in six files (15s per-test timeout to tolerate concurrent repository gates). This includes updated existing assertions for direct turn access and automatic selection of the sole legal bankruptcy sector. Changed-file lint and diff whitespace checks passed. The final map suite, including the last two retention/commit regressions, has 13 tests.

No map mutations, engine rule changes, spectator private information, or new command types were introduced. Human/device playtests remain a manual acceptance criterion; the supervisor owns release checks and browser evidence.
