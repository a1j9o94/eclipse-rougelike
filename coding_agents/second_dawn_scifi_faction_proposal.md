# Science-fiction faction expansion proposal

Date: October 9, 2026  
Status: Design proposal; gameplay implementation is a separate task.  
Target: The current Eclipse: Second Dawn game, not the retired roguelike.  
Proposed destination: `coding_agents/second_dawn_scifi_faction_proposal.md`

## Outcome and scope

Add an optional roster of eight book-inspired civilizations whose abilities change strategic decisions throughout a match. Each civilization should have a recognizable fantasy, a concise signature rule, and counterplay that other players can understand.

This proposal records the October 9 design discussion. **Supported direction** means the player expressed interest in that concept; it does not mean every numerical value or implementation detail is approved. **Prototype recommendation** means a concrete rule proposed for initial testing. **Open decision** means a question that must be resolved before implementing the affected behavior. No final starting economies, complete blueprints, or balance claims are established here.

All names are working fan-design labels. Mechanics are adaptations for this game, not claims that the books literally follow these rules.

| Civilization | Inspiration | Strategic identity | Discussion status |
| --- | --- | --- | --- |
| Merry Band of Pirates | Expeditionary Force / ExFor | Advanced access and discoveries supporting an ordinary fleet | Starting Wormhole Generator and discoveries are the intended direction |
| Replicant Commonwealth | Bobiverse | Ships are productive assets as well as a navy | Materials population on mobile ships is the preferred direction; extra ships mean reserve supply |
| Trisolarans | The Three-Body Problem | Temporary control of scarce technologies | Technology reservation supported; surveillance dropped |
| Portiids | Children of Time | Learn valuable technology through encounters | Copying rare technology and discovery hardware supported |
| Spacing Guild | Dune | Dispersed transport infrastructure and resource brokerage | Combined remote exploration, portals, tolls, non-pinning ships, and direct trade package endorsed |
| Formics | Ender's Game | Mixed fleets move as coordinated groups | Larger ships carrying movement for smaller classes supported |
| The Culture | Culture series | Exceptional ships with a meaningful incentive for relationships | Retain as a candidate; earlier small-fleet/diplomacy design rejected as too weak |
| Belters / OPA | The Expanse | Risk-taking raids and salvage finance further combat | Salvage identity supported; exact settlement rules remain provisional |

Mars is parked because the discussed bonuses did not create a distinctive enough strategy. Manticore was an initial brainstorm and is outside this selected proposal. These are not permanent exclusions.

## Design principles

1. Make faction identity visible in player decisions, rather than accumulating unrelated bonuses.
2. Preserve the existing money, science, materials, population, influence, and ship systems wherever possible. "Gold" in the discussion means the game's Money resource; use one consistent interface label.
3. Preserve meaningful combat. Trade, infrastructure, and research powers should affect military choices without depending on universal peace.
4. Restrict opponents through short, visible windows and available alternatives. Avoid recurring cancellation of an entire turn.
5. Establish costs, ownership, limits, and timing in previews before a player commits.
6. Tune numerical strength after verifying that the signature rule is used, understood, and strategically interesting.
7. Keep the pack optional and versioned. Existing matches retain their original rules and faction choices.

## 1. Merry Band of Pirates — Expeditionary Force

**Fantasy:** An ordinary human civilization survives through access to Skippy and an unpredictable collection of advanced discoveries.

**Supported direction:** Start with Wormhole Generator and several random discoveries. Wormhole Generator is the adjacent-sector technology that relaxes the requirement for matching wormhole edges. It is not Warp Portal, which connects distant portal sectors.

**Prototype recommendation:**

- Start with permanent Wormhole Generator technology.
- During setup, privately draw three discoveries and keep two. Resolve them using normal discovery rules, including choices, physical parts, and applicable reward handling. Record setup choices for deterministic recovery.
- Retain an ordinary fleet rather than adding a general combat-stat bonus.
- Use a weaker starting industrial economy as the first balance lever; values are not yet selected.

**Player decision:** Which discoveries shape this run, and which opportunity can the fleet reach through a connection others cannot use?

**Counterplay and risks:** Early access and multiple discoveries can accelerate expansion, research discounts, and combat simultaneously. Wormhole Generator's normal track placement and discount effects must be counted in its value. Discovery variance may dominate the opening.

**Open decisions:** Discovery count; draw-and-keep versus simply receiving random discoveries; setup VP/cash alternatives; precise economic offset. A temporary Skippy connection is a parked alternative, not an additional ability in this proposal.

**Acceptance scenarios:** Setup technology grants the correct connections; discoveries leave the supply exactly once; private choices stay private; stored parts remain limited; setup survives reload and replay; no mistaken grant of Warp Portal.

## 2. Replicant Commonwealth — Bobiverse

**Fantasy:** Replicant ships carry automated industry. Expanding the fleet expands production, while losing ships can damage the economy.

**Supported direction:** Combine the population-bearing idea of Exiles' orbitals with proper mobile ships. Add one extra ship of each mobile class to the available component supply, not to the starting deployed fleet.

**Prototype recommendation — Autofactories:**

- Each interceptor may carry one materials population cube.
- Populate an interceptor using a normal colony-ship expenditure and an available materials cube. Initially require the interceptor to be in a controlled sector when populated.
- The cube moves with its individual ship and contributes to the normal materials income track. It does not create a separate fixed payment per ship.
- A loaded interceptor uses the normal interceptor blueprint, moves, and fights. Production continues wherever the ship travels.
- Destroying that interceptor returns its cube to the materials population track, reducing subsequent income. Population-track capacity and return handling must be explicitly specified.
- Add one interceptor, one cruiser, and one dreadnought to normal supply limits. No extra starting deployment and no extra starbase are implied.

The separate construction discount called Replicate and the materials-orbital exception are omitted from the initial prototype. Building and populating another ship already expresses replication.

**Player decision:** Keep industrial ships safe, or risk productive assets to gain territory and discoveries?

**Counterplay and risks:** Mobile population can expand industry without adding influenced sectors and upkeep. Existing population cubes remain finite; no new population cubes are created. Cheap interceptors, the nonlinear income track, and shielding factories behind empty ships can produce a strong economic advantage. Start with a weaker conventional industrial base before imposing unrelated restrictions.

**Open decisions:** Casualty selection between loaded and empty interceptors; voluntary unloading; population recovery and a full destination track; whether carrying population changes reputation value. Start with no bonus factory VP. Expansion to other ship classes is deferred.

**Acceptance scenarios:** A cube is associated with a specific ship; loading requires the right resource and colony capacity; movement preserves it; income counts it once; casualties return the correct cube once; loaded ships are distinguishable publicly; supply is increased without changing initial fleet size.

## 3. Trisolarans — The Three-Body Problem

**Fantasy:** Shape rivals' research options by temporarily controlling access to scarce technologies.

**Supported direction:** Technology reservation and constrained interference. The exploration-surveillance proposal is dropped; public ship movement does not justify a surveillance power.

**Prototype recommendation — Scientific interference:** After completing a Research action, reserve one remaining physical market technology tile until the beginning of your next turn. Only you may research that tile during this interval. You may hold one reservation. The reservation is visible and free in the first experiment.

The protected object is one tile, not every copy of its technology. Reservation does not grant the technology, prevent all research, or transfer ownership of the tile. If another copy exists, rivals can buy it. A longer reservation through the end of the round with a science cost is an alternative to test later.

**Player decision:** Protect a future purchase, delay a rival, or steer their turn toward another opportunity?

**Counterplay and risks:** Other copies, other technologies, and other actions remain available. Rare single-copy technologies create the strongest denial. Reservation has little value when the entire variant inventory is already available or late in the action phase. Repeated turn-boundary replacement could excessively delay one tile.

**Open decisions:** Whether reservations protect against only Research or every market-acquisition effect; duration across passing and reactions; release on round end, elimination, or resignation; science cost if free short reservations prove too strong. A reservation must expire on an explicit reachable boundary, not wait indefinitely for a normal turn after passing.

**Acceptance scenarios:** Reserving one copy leaves another available; expiry occurs at the stated boundary; reserved tiles are clearly marked; forbidden purchases are rejected without spending resources; recovery, AI takeover, and game end cannot strand reservations.

## 4. Portiids — Children of Time

**Fantasy:** Encounters reveal technology the civilization can understand and reproduce.

**Supported direction:** Copying can include rare researched technologies and valuable hardware originating in discoveries.

**Prototype recommendation — Reverse engineering:**

- After a battle against another civilization in which at least one Portiid ship survives, record one researched technology the opponent possesses or one ancient part installed in a participating opposing ship blueprint.
- Hold at most one pending reverse-engineering project. Recording a replacement requires an explicit choice to abandon the old project.
- On a later Research action, complete the project by paying science and consuming a research activation.
- A researched technology is acquired at its normal faction-discounted cost without consuming or requiring a market tile. Rare technology is eligible.
- An ancient part yields one physical component for a separately defined science cost. It does not unlock an unlimited reproducible part type.
- Resource caches, direct VP rewards, free ships, and other one-time discovery effects are not copyable in the first prototype.

Retreat with a surviving ship can qualify; mere adjacency cannot. A battle snapshot should preserve eligible evidence even if the opponent later upgrades or loses all participating ships.

**Player decision:** Risk a fleet to gain access to scarce hardware, then choose whether to spend science on it or pursue ordinary research.

**Counterplay and risks:** Opponents can avoid contact, destroy the observing fleet, or exploit the delay before reproduction. Ancient parts are normally scarce; repeated copying of particularly powerful parts may need a per-part or per-game limit. Technological encounters must not become costless staged farming between cooperative players.

**Open decisions:** Ancient-part science prices; repeated acquisition limits; whether source hardware must fire or merely be installed; exact researched-technology eligibility; placement and storage of replicated parts. Copying an opponent's complete one-time discovery reward is outside the current scope.

**Acceptance scenarios:** Rare research works without a market tile; technology ownership cannot duplicate; source evidence survives battle resolution; fabricated components remain physical and limited; project replacement is explicit; copying hardware does not grant its discovery's VP alternative.

## 5. Spacing Guild — Dune

**Fantasy:** Establish dispersed infrastructure that other civilizations want to use, collect transport income, and exchange surplus resources for what the Guild needs.

**Supported direction:** The combined package below was endorsed as coherent. Its numerical limits are prototype values rather than proven balance.

### Remote prospecting

Once per round, one Explore activation may place a normally drawn sector III tile in any otherwise legal outer-sector position adjacent to an existing sector, without requiring a nearby Guild-controlled sector or unpinned Guild fleet. The neighboring sector may belong to another player.

Keep normal exploration draws and choices, tile supply, outer-placement limits, rotation/connectivity rules, and influence and colonization costs. Claiming the new sector is optional and consumes a normal influence disc; neither a free ship nor a free developed colony is granted. The position still belongs to the outer ring: this is not permission to place sector III tiles in the inner or middle rings.

**Decision:** Place a valuable outpost where customers need it, while accepting that a nearby rival may conquer it more easily than the Guild can reinforce it.

### Transport network

- Start with a Warp Portal on the home sector.
- Receive two additional portal markers, deployable when claiming a sector. There may be at most one portal in a sector.
- Connect to all other Warp Portals on the board under ordinary portal connectivity, including naturally occurring and other civilizations' portals.
- A free starting Warp Portal technology is not part of this recommendation: granting it as well could add another portal and a technology-track benefit.

**Open decisions:** Whether a marker can later be placed in an already controlled sector; scoring of faction-granted portals; reuse of a lost marker. Initial recommendation: no additional faction portal VP and no automatic marker recovery after conquest, subject to a final compatibility check with existing portal scoring.

### Open passage

Guild ships cannot pin other civilizations' ships. Other civilizations can pin Guild ships normally. Preserve special neutral restrictions such as the GCDS rather than treating all neutral rules as player pinning.

This is a movement exception, not peaceful coexistence or shared sector ownership. Ships that end movement together still follow normal battle rules. Merely passing through a sector does not initiate an immediate battle there.

### Transport fees

Each foreign ship using a Warp Portal connection involving a Guild-controlled portal sector transfers one Money to the Guild, at most once per Move action for that ship. Multiple eligible hops within that action do not charge it repeatedly. Guild ships are exempt. Movement over ordinary wormhole connections is free, even when a sector contains a portal.

The price is fixed, payment is automatic, and the Guild cannot refuse a particular customer. The movement preview displays the route, total fee, and recipient before commitment. The payer must have sufficient uncommitted Money; reject an unaffordable proposed movement without partial execution or payment. If both endpoints are Guild-controlled, charge once for the hop.

Capturing an outpost removes the Guild's toll entitlement there; the portal remains. A link can still be eligible if its other endpoint remains Guild-controlled. Pay using control at the moment of traversal. Normal invasion routes remain available, and enemies may pay to transport an invasion fleet.

For Formic convoys, count each transported ship as a customer even though the convoy uses one movement activation. This avoids giving a larger group a hidden toll exemption; the interface must show its combined fee.

### Resource brokerage

Only exchanges involving the Guild gain this special permission. The Guild posts finite standing offers to receive one resource and give an equal quantity of a different resource. Money, science, and materials are all eligible. Both sides exchange real inventory; resources are neither minted nor paid to the bank.

Example: receive up to three Science and give three Materials at a 1:1 rate. Another player may fill some or all of the offer during their own active turn without spending an influence disc. The Guild changes or cancels offers during its own turn. A customer does not wait for another approval prompt.

Reserve offered outgoing inventory when an offer is posted. Each unit can back only one offer and cannot simultaneously pay construction, research, tolls, or upkeep. Filling an offer checks both balances, updates both players, and decreases remaining volume in one authoritative transaction. Cancelling or expiring an offer releases unused inventory. Expire offers at the action-phase/upkeep boundary so escrow cannot prevent upkeep payment.

Trading remains optional. Normal Convert rates still apply when trading with the bank; this ability is not a permanent 1:1 bank conversion rate. Initial offers require equal units in both directions and different resource types, excluding gifts and arbitrary subsidies.

**Open decisions:** Number of simultaneous offers; offer-volume limits; exact end-of-round timing; treatment after passing, resignation, and AI takeover. Initial recommendation: acceptance on an active pre-pass turn only, no reaction/upkeep trades, and cancellation on resignation. Do not insert a new negotiation pause into every movement.

### Counterplay, balance, and acceptance

Rivals can use alternate routes, develop competing portals, refuse unfavorable trades, or capture outposts. The Guild has normal military capability and scoring initially; do not add weak ships or a special VP engine before measuring the existing package. If remote expansion, tolls, and resource access overperform, reduce starting resources or portal supply before removing the identity.

The faction is likely more interactive with several opponents. Two-player and solo-AI games must remain viable without assuming that rivals voluntarily help the Guild win. AI customers should compare trade against their own shortages, bank conversion, toll costs, and strategic consequences.

**Acceptance scenarios:** Remote exploration respects legal outer positions and supply; influence is paid; Guild ships are excluded from player pinning counts but remain vulnerable; portal paths charge only eligible traversals; fee and recipient previews agree with execution; normal links stay free; conquest changes toll eligibility; posted offers reserve inventory without duplication; partial fills conserve every resource; stale concurrent acceptance fails safely; cancelling and upkeep release escrow; all transfers survive replay and undo consistently.

## 6. Formics — Ender's Game

**Fantasy:** Mixed fleets move through hive coordination, giving larger ships a command role.

**Supported direction:** Start with a cruiser and let larger ship classes coordinate movement for the immediate smaller class.

**Prototype recommendation:** Replace the ordinary starting interceptor with one cruiser; whether the cruiser replaces or supplements the starting fleet remains an open balance decision. When a cruiser moves, it may take up to two interceptors. When a dreadnought moves, it may take up to two cruisers. Each group consumes one movement activation.

Ships begin in the same sector and follow the same path to the same destination. Every ship must have enough movement. Validate the selected group atomically against normal fleet pinning and route restrictions: the fleet must be allowed to move that many ships out of the origin and through each intermediate sector. Sharing an activation does not bypass pinning. Do not chain escorts: cruisers accompanying a dreadnought cannot bring additional interceptors. Ordinary unescorted movement remains available.

There is no special Queen unit or fleet-collapse rule in this version.

**Player decision:** Build and maintain a mixed fleet to improve movement efficiency, while deciding how much force to concentrate in one convoy.

**Counterplay and risks:** Cheap coordinated movement can accelerate attacks and reinforcements. Concentration exposes the faction to threats elsewhere, and a slower escort constrains the shared route. Starting cruiser strength and movement efficiency must be balanced together.

**Open decisions:** Starting economic offset; selection interface; whether reaction movement can use coordination. Initial recommendation: ordinary action-phase movement only until reaction balance is assessed.

**Acceptance scenarios:** Legal cruiser-plus-two-interceptor and dreadnought-plus-two-cruiser groups cost one activation; mixed origins, excessive escorts, inadequate drive range, pinned escorts, and recursive convoys are rejected before mutation; toll previews count every foreign convoy ship.

## 7. The Culture

**Fantasy:** Highly capable ships support both military intervention and valuable diplomatic relationships.

**Discussion status:** The four-mobile-ship cap and a small diplomacy bonus were rejected as too weak for this combat-heavy game. The replacement below is a candidate requiring further review, not an endorsed final statline.

**Prototype recommendation — Minds and Contact:**

- Add one usable part slot to each mobile ship blueprint.
- Add permanent energy production, with the amount to be selected after examining complete loadouts.
- Add two bonus endgame VP per maintained diplomatic relationship beyond normal ambassador scoring, using normal relationship limits.
- Keep ordinary fleet supply. No four-ship cap, universal pacifism, or blanket ban on combat.

**Player decision:** Use unusually complete ship loadouts to intervene militarily, while weighing the additional scoring cost of attacking a diplomatic partner.

**Counterplay and risks:** Extra slots and energy may create dominant blueprints, especially with ancient parts. A diplomacy bonus must be large enough to matter without becoming uncontrollable in high-player-count games or irrelevant against AI. Reciprocal agreement should not become trivial bonus farming without strategic consequences.

**Open decisions:** Permanent energy by ship class; home economy; diplomacy VP value and any cap; reputation-slot configuration. Reassess the whole package before implementation rather than assuming this numerical recommendation fixes the original weakness.

**Acceptance scenarios:** Additional slots and permanent energy are identical in server rules, previews, and combat; relationships award bonuses once; broken relationships do not score; ordinary aggression remains possible; strong loadouts have documented counterplay.

## 8. Belters / OPA — The Expanse

**Fantasy:** Take economically useful risks. An unfavorable raid can fund rebuilding even when it does not win territory.

**Supported direction:** Salvage should incentivize earlier combat and risk-taking.

**Prototype recommendation — Salvage:** After a battle in which at least one Belter ship survives, gain Materials for opposing ships destroyed in that battle. Retreating with a survivor can qualify even when the opponent holds the sector. Initial candidate: one Material per opposing ship destroyed, capped at three Materials per battle.

Destroyed friendly ships do not generate salvage initially. Settlement occurs once after the battle ends; materials are available for subsequent construction, not reinforcements within that battle. No extra orbital subsystem is necessary to establish the core identity.

**Player decision:** Is this raid worth its losses even if the fleet must withdraw afterward?

**Counterplay and risks:** Destroying the entire raiding fleet prevents settlement. Retreat qualification must follow the battle's actual survivor record, not require ships to remain in the original sector. Cheap enemy ships, repeat staged battles, and frequent small encounters can favor salvage farming.

**Open decisions:** Neutral Ancient/Guardian/GCDS eligibility; per-class payouts; whether coalition battles use total opposing losses or attributable kills; reaction-battle timing. Proposed first settlement uses unique destroyed opposing ship IDs and only one payout, with neutral eligibility resolved explicitly before implementation.

**Acceptance scenarios:** Victory and surviving retreat can pay; total fleet loss cannot; friendly wrecks do not pay; the cap applies once per battle; repeated aftermath/reload cannot duplicate income; multi-party fights use a declared attribution rule.

## Integration and compatibility

Current extension points include `shared/eclipse/catalog.ts` for faction setup, supplies, activations and special abilities; `blueprints.ts` and `parts.ts` for ship loadouts; `actions.ts`, `legal.ts`, `geometry.ts`, and `rulesState.ts` for actions and routes; `discoveries.ts` for rewards; economy/upkeep, battle, scoring, AI, and command-preview modules for effects and decisions. UI entry points include the faction picker, ability controls, movement/build/research workflows, and public fleet presentation. Confirm exact file responsibilities against the checkout at implementation time.

Several abilities require new state, not merely catalog rows: ship-associated population, expiring reservations, reverse-engineering evidence, Guild portal entitlement, paid traversal history within an action, escrowed offers, convoy movement, and settled salvage records. Use explicit typed capabilities and shared helpers rather than scattering faction-ID checks through UI and server.

Persist content-pack and rules versions. Restrict the first prototype to Standard rules unless a faction has separately verified variant support. The current Less Random source inventory excludes Warp Portals, so the Guild must not silently reintroduce them there. Technology-copy and reservation semantics also need a separate review in that mode.

New offers, tolls, reservations, and evidence must participate in authoritative persistence, saved randomness, public/private views, undo, and replay. Undo cannot erase information already learned by humans; existing recovery limitations still apply. AI takeover must release or assume temporary obligations according to an explicit rule.

Players must be able to identify the faction independently of piece color, read its core rules before choosing it, and understand any exceptional state on the board. Introduce no new ownership-sharing model in this pack.

## Recommended delivery sequence

This is a recommendation, not an authorization to begin gameplay changes.

1. **Finalize rule boundaries:** Resolve the open decisions affecting legality, resource conservation, scoring, and timing; establish complete starting sheets and blueprint candidates.
2. **First representative prototypes:** ExFor for setup/catalog effects, Belters for battle settlement, and Formics for grouped movement. Each needs its own economy and AI evaluation.
3. **Mobile industry and reverse engineering:** Bobiverse and Portiids, with explicit per-ship/per-project state and readable decisions.
4. **Market intervention:** Trisolarans, after defining turn/round expiry and interaction with other acquisition effects.
5. **Guild system:** Deliver remote prospecting and network placement, then pinning/tolls, then standing offers. Judge the combined faction before balancing the isolated slices.
6. **Culture:** Review a complete military/diplomatic statline before implementing the replacement candidate.

Each implemented slice follows the repository's TDD, relevant tests, lint, build, and release process. Prototype availability remains opt-in until its complete player and AI flows are verified.

## Playtest acceptance and balance evidence

For every faction, require a successful full match, save/resume, multiplayer synchronization, legal AI play, and a player who can explain the signature rule after reading the faction sheet. Confirm that previews match authoritative outcomes and that existing factions and saves behave as before.

Measure signature-ability usage and unused opportunities, comprehension errors, action efficiency, early economic acceleration, fleet losses, research access, territory held, final score sources, and opponent responses. Compare multiple seeds, seat positions, player counts, opponents, and player skill; a few wins cannot establish balance.

| Faction | Specific evidence to collect |
| --- | --- |
| ExFor | Discovery variance; time to first valuable exploration/combat; generator-created routes and research discounts |
| Bobiverse | Production attributable to loaded interceptors; income gained without extra upkeep; factories lost and casualty shielding |
| Trisolarans | Reservations used, displaced research, effective denial duration, and frequency of alternate-copy purchases |
| Portiids | Encounters sought for learning; copied rare technology/parts; science paid; repeat acquisition and cooperative farming |
| Guild | Remote sectors held/lost; portal traffic and toll income; offers filled; resources received; competing routes; customer advantage |
| Formics | Ships moved per activation; convoy composition; offensive reach; pinning constraints; extra opening cruiser value |
| Culture | Loadout dominance; military results; diplomatic VP share; relationship retention and betrayal decisions |
| Belters | Raids made earlier; salvage from retreat; fleet replacement; payout caps; staged-battle incentives |

## Decision log and follow-ups

- Extra Bobiverse ships mean reserve component supply, not a larger opening fleet.
- Skippy's starting technology is Wormhole Generator. Guild infrastructure uses Warp Portals.
- Bobiverse's preferred distinction is population-bearing interceptors; an additional build-discount mechanic is omitted initially.
- Trisolaran surveillance is dropped. Technology reservation remains the core supported direction.
- Portiid copying includes rare research and ancient hardware; copying every discovery reward is outside the prototype.
- Guild includes remote prospecting, a limited portal network, ships that cannot pin, fixed paid transport, and finite 1:1 direct resource offers.
- Guild movement exceptions do not confer peaceful coexistence or shared player ownership.
- Formics use immediate-lower-class convoys, start with a cruiser, and do not use a Queen-collapse rule.
- Culture's previous four-ship cap is removed from consideration; its revised package remains provisional.
- Belter salvage is intended to reward surviving raids, including retreats; Mars is parked.

**Immediate follow-ups:** Review this proposal, settle the open rule decisions for the first prototype batch, then request an implementation plan with full faction sheets and fail-first tests.

**Risks and rollback:** The main risks are early economic snowballs, oppressive market denial, staged encounter/trade incentives, multiplayer state complexity, AI undervaluing new mechanics, and incompatible variant behavior. Keep gameplay behind a new content-pack/rules version. A future rollback should disable the pack for new matches while preserving the versioned behavior of already-created matches.

**Document validation:** Check all eight proposed factions, explicit reserve-supply and portal terminology corrections, retained/deferred decisions, source file links, and Markdown structure. This change is a proposal and planning-log entry only; gameplay tests, lint, build, and deployment verification belong to a subsequent implementation change.

## Repository references

- [Current game and supported modes](../README.md)
- [Faction registry and setup](../shared/eclipse/catalog.ts)
- [Technology effects](../shared/eclipse/technologies.ts)
- [Discovery effects and physical parts](../shared/eclipse/discoveries.ts)
- [Connections and pinning](../shared/eclipse/geometry.ts)
- [Action execution](../shared/eclipse/actions.ts)
- [Population income tracks](../shared/eclipse/tracks.ts)
- [Existing expansion assessment](second_dawn_faction_expansion_assessment.md)
