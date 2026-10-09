# Science-fiction faction expansion proposal

Date: October 9, 2026  
Status: Player decisions recorded October 9, 2026; implemented first versions are documented in [the implementation plan](second_dawn_scifi_implementation.md).
Target: The current Eclipse: Second Dawn game, not the retired roguelike.  
Proposed destination: `coding_agents/second_dawn_scifi_faction_proposal.md`

## Outcome and scope

Prepare seven book-inspired civilizations for first-version implementation, with The Culture held as a future candidate, whose abilities change strategic decisions throughout a match. Each civilization should have a recognizable fantasy, a concise signature rule, and counterplay that other players can understand.

This proposal records the October 9 design discussion. **Supported direction** means the player expressed interest in that concept; it does not mean every numerical value or implementation detail is approved. **Prototype recommendation** means a concrete rule proposed for initial testing. **Open decision** means a question that must be resolved before implementing the affected behavior. No final starting economies, complete blueprints, or balance claims are established here.

All names are working fan-design labels. Mechanics are adaptations for this game, not claims that the books literally follow these rules.

| Civilization | Inspiration | Strategic identity | Discussion status |
| --- | --- | --- | --- |
| Merry Band of Pirates | Expeditionary Force / ExFor | Advanced access and discoveries supporting an ordinary fleet | Confirmed: Wormhole Generator; draw three discoveries, keep two; normal reward alternatives |
| Replicant Commonwealth | Bobiverse | Ships are productive assets as well as a navy | Confirmed: materials-bearing interceptors, production everywhere, reserve supply, ordinary firing-side target selection |
| Trisolarans | The Three-Body Problem | Temporary control of scarce technologies | Confirmed: short reservation once per round, market acquisition only; surveillance dropped |
| Portiids | Children of Time | Learn valuable technology through encounters | Confirmed: surviving retreat qualifies; copied ancient hardware is a single physical part with normal discovery handling |
| Spacing Guild | Dune | Dispersed transport infrastructure and resource brokerage | Confirmed: fixed permanent markers, legal outer remote placement, ordinary onward exploration, tolls and direct trade |
| Formics | Ender's Game | Mixed fleets move as coordinated groups | Confirmed: one starting cruiser, no recursive escorts, coordination on normal moves only |
| The Culture | Culture series | Exceptional ships with a meaningful incentive for relationships | Held: outside first-version implementation pending thematic review |
| Belters / OPA | The Expanse | Risk-taking raids and salvage finance further combat | Confirmed: neutrals and surviving retreats qualify; sector-battle wrecks need not be the Belters' kills |

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

**Confirmed direction:** Start with Wormhole Generator; privately draw three discoveries, keep two, and allow normal resource/VP alternatives. Wormhole Generator is the adjacent-sector technology that relaxes the requirement for matching wormhole edges. It is not Warp Portal, which connects distant portal sectors.

**Prototype recommendation:**

- Start with permanent Wormhole Generator technology.
- During setup, privately draw three discoveries and keep two. Resolve them using normal discovery rules, including choices, physical parts, and applicable reward handling. Record setup choices for deterministic recovery.
- Retain an ordinary fleet rather than adding a general combat-stat bonus.
- Use a weaker starting industrial economy as the first balance lever; values are not yet selected.

**Player decision:** Which discoveries shape this run, and which opportunity can the fleet reach through a connection others cannot use?

**Counterplay and risks:** Early access and multiple discoveries can accelerate expansion, research discounts, and combat simultaneously. Wormhole Generator's normal track placement and discount effects must be counted in its value. Discovery variance may dominate the opening.

**Remaining balance work:** Precise starting economic offset. Discovery count, draw-and-keep format, and normal reward alternatives are confirmed for the first version. A temporary Skippy connection is a parked alternative, not an additional ability in this proposal.

**Acceptance scenarios:** Setup technology grants the correct connections; discoveries leave the supply exactly once; private choices stay private; stored parts remain limited; setup survives reload and replay; no mistaken grant of Warp Portal.

## 2. Replicant Commonwealth — Bobiverse

**Fantasy:** Replicant ships carry automated industry. Expanding the fleet expands production, while losing ships can damage the economy.

**Supported direction:** Combine the population-bearing idea of Exiles' orbitals with proper mobile ships. Add one extra ship of each mobile class to the available component supply, not to the starting deployed fleet.

**Prototype recommendation — Autofactories:**

- Each interceptor may carry one materials population cube.
- Populate an interceptor using a normal colony-ship expenditure and an available materials cube. Initially require the interceptor to be in a controlled sector when populated.
- The cube moves with its individual ship and contributes to the normal materials income track. It does not create a separate fixed payment per ship.
- A loaded interceptor uses the normal interceptor blueprint, moves, and fights. Production continues wherever the ship travels.
- Use ordinary combat damage allocation: the owner of the firing ships chooses eligible targets, including loaded interceptors. This applies to either side's volley, not just the strategic battle attacker. The Bobiverse player receives no special right to substitute an empty ship for a targeted factory. Neutral attacks retain their ordinary targeting policy.
- Destroying that interceptor returns its cube to the materials population track, reducing subsequent income. Population-track capacity and return handling must be explicitly specified.
- Add one interceptor, one cruiser, and one dreadnought to normal supply limits. No extra starting deployment and no extra starbase are implied.

The separate construction discount called Replicate and the materials-orbital exception are omitted from the initial prototype. Building and populating another ship already expresses replication.

**Player decision:** Keep industrial ships safe, or risk productive assets to gain territory and discoveries?

**Counterplay and risks:** Mobile population can expand industry without adding influenced sectors and upkeep. Existing population cubes remain finite; no new population cubes are created. Cheap interceptors and the nonlinear income track can produce a strong economic advantage. Normal opposing target selection makes loaded factories vulnerable rather than allowing empty ships to absorb their casualties automatically. Start with a weaker conventional industrial base before imposing unrelated restrictions.

**Remaining rule details:** Voluntary unloading; population recovery and a full destination track; whether carrying population changes reputation value. Target selection is settled: use normal firing-side allocation, replacing the earlier owner-selected-casualty recommendation. Start with no bonus factory VP. Expansion to other ship classes is deferred.

**Acceptance scenarios:** A cube is associated with a specific ship; loading requires the right resource and colony capacity; movement preserves it; income counts it once; casualties return the correct cube once; the firing side can target a loaded factory under normal eligibility rules; loaded ships are distinguishable publicly; supply is increased without changing initial fleet size.

## 3. Trisolarans — The Three-Body Problem

**Fantasy:** Shape rivals' research options by temporarily controlling access to scarce technologies.

**Supported direction:** Technology reservation and constrained interference. The exploration-surveillance proposal is dropped; public ship movement does not justify a surveillance power.

**Confirmed first-version rule — Scientific interference:** Once per round, after completing a Research action, reserve one remaining physical market technology tile until the beginning of your next turn or the end of the round, whichever comes first. Only you may acquire that market tile during this interval. You may hold one reservation. It is visible and free. Reservation blocks market acquisition, including discovery effects that select market tiles, but does not block Portiid reverse engineering that uses no market tile.

The protected object is one tile, not every copy of its technology. Reservation does not grant the technology, prevent all research, or transfer ownership of the tile. If another copy exists, rivals can buy it. A paid longer-duration denial ability is outside the confirmed first version.

**Player decision:** Protect a future purchase, delay a rival, or steer their turn toward another opportunity?

**Counterplay and risks:** Other copies, other technologies, and other actions remain available. Rare single-copy technologies create the strongest denial. Reservation has little value when the entire variant inventory is already available or late in the action phase. The once-per-round limit prevents repeatedly extending a reservation through successive Research turns.

**Remaining lifecycle details:** Release on elimination or resignation, and explicit handling of passing before the next turn. Duration, free price, once-per-round use, and market-only scope are settled. Release no later than round end. A reservation must expire on an explicit reachable boundary, not wait indefinitely for a normal turn after passing.

**Acceptance scenarios:** Reserving one copy leaves another available; expiry occurs at the stated boundary; reserved tiles are clearly marked; forbidden purchases are rejected without spending resources; recovery, AI takeover, and game end cannot strand reservations.

## 4. Portiids — Children of Time

**Fantasy:** Encounters reveal technology the civilization can understand and reproduce.

**Confirmed direction:** Copying can include rare researched technologies and valuable hardware originating in discoveries. Retreat with a surviving ship qualifies. Each acquired ancient-part copy is one physical component, handled as if discovered.

**Prototype recommendation — Reverse engineering:**

- After a battle against another civilization in which at least one Portiid ship survives, record one researched technology the opponent possesses or one ancient part installed in a participating opposing ship blueprint.
- Hold at most one pending reverse-engineering project. Recording a replacement requires an explicit choice to abandon the old project.
- On a later Research action, complete the project by paying science and consuming a research activation.
- A researched technology is acquired at its normal faction-discounted cost without consuming or requiring a market tile. Rare technology is eligible.
- An ancient part yields one physical component for a separately defined science cost. It cannot be installed in multiple blueprints or duplicated from that acquired component. Follow the corresponding discovery part's normal installation, storage, and removal rules; this does not mean its weapon fires only once or its effect lasts one combat round.
- Resource caches, direct VP rewards, free ships, and other one-time discovery effects are not copyable in the first prototype.

Retreat with a surviving ship can qualify; mere adjacency cannot. A battle snapshot should preserve eligible evidence even if the opponent later upgrades or loses all participating ships.

**Player decision:** Risk a fleet to gain access to scarce hardware, then choose whether to spend science on it or pursue ordinary research.

**Counterplay and risks:** Opponents can avoid contact, destroy the observing fleet, or exploit the delay before reproduction. Ancient parts are normally scarce; repeated copying of particularly powerful parts may need a per-part or per-game limit. Technological encounters must not become costless staged farming between cooperative players.

**Remaining decisions:** Ancient-part science prices; whether separate future encounters can create another physical copy of the same named part; whether source hardware must fire or merely be installed; exact researched-technology eligibility. Normal installation, storage, and removal handling is settled. The player's single-physical-part clarification does not by itself establish a new once-per-named-part-per-game restriction; repeated acquisition remains explicit rather than inferred. Copying an opponent's complete one-time discovery reward is outside the current scope.

**Acceptance scenarios:** Rare research works without a market tile; technology ownership cannot duplicate; source evidence survives battle resolution; fabricated components remain physical and limited; project replacement is explicit; copying hardware does not grant its discovery's VP alternative; one acquired component cannot occupy multiple blueprints and follows normal removal behavior.

## 5. Spacing Guild — Dune

**Fantasy:** Establish dispersed infrastructure that other civilizations want to use, collect transport income, and exchange surplus resources for what the Guild needs.

**Supported direction:** The combined package below was endorsed as coherent. Its numerical limits are prototype values rather than proven balance.

### Remote prospecting

Once per round, one Explore activation may place a normally drawn sector III tile in any otherwise legal outer-sector position adjacent to an existing sector, without requiring a nearby Guild-controlled sector or unpinned Guild fleet. The neighboring sector may belong to another player.

Keep normal exploration draws and choices, tile supply, outer-placement limits, rotation/connectivity rules, and influence and colonization costs. Claiming the new sector is optional and consumes a normal influence disc; neither a free ship nor a free developed colony is granted. The position still belongs to the outer ring: this is not permission to place sector III tiles in the inner or middle rings.

The remote exception changes the initial exploration source requirement, not the Guild's later exploration options. Once established, a Guild-controlled outpost or legally unpinned fleet can be a normal exploration source. Subsequent ordinary Explore activations can draw sector II or sector I tiles where coordinate distance, connectivity, supply, and placement rules permit. Rival willingness to leave routes open and empty space in lower-player-count games can make this inward expansion valuable. Guardian sectors may offer opportunities under ordinary exploration and pinning rules; the Guild gains no immunity, coexistence, or free control of Guardians or the GCDS.

**Decision:** Place a valuable outpost where customers need it, while accepting that a nearby rival may conquer it more easily than the Guild can reinforce it.

### Transport network

- Start with a Warp Portal on the home sector.
- Receive two additional portal markers, deployable when claiming a sector. There may be at most one portal in a sector.
- Connect to all other Warp Portals on the board under ordinary portal connectivity, including naturally occurring and other civilizations' portals.
- A free starting Warp Portal technology is not part of this recommendation: granting it as well could add another portal and a technology-track benefit.

**Confirmed marker rules:** The set is fixed. Once deployed, a portal is permanent, cannot be relocated, and its marker is not recovered after conquest. It must occupy a valid sector. **Remaining details:** Whether an undeployed marker can be placed in an already controlled sector; scoring of faction-granted portals. Initial recommendation: no additional faction portal VP, subject to a final compatibility check with existing portal scoring.

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

**Open decisions:** Number of simultaneous offers; offer-volume limits; exact end-of-round timing; treatment after passing, resignation, and AI takeover. Confirmed acceptance window: customers trade on their active pre-pass turns, with no reaction/upkeep trades. The Guild's posted offers remain available to those customers after the Guild passes and expire before upkeep. Cancellation on resignation remains the implementation recommendation. Do not insert a new negotiation pause into every movement.

### Counterplay, balance, and acceptance

Rivals can use alternate routes, develop competing portals, refuse unfavorable trades, or capture outposts. The Guild has normal military capability and scoring initially; do not add weak ships or a special VP engine before measuring the existing package. If remote expansion, tolls, and resource access overperform, reduce starting resources or portal supply before removing the identity.

The faction is likely more interactive with several opponents. Two-player and solo-AI games must remain viable without assuming that rivals voluntarily help the Guild win. AI customers should compare trade against their own shortages, bank conversion, toll costs, and strategic consequences.

**Acceptance scenarios:** Remote exploration respects legal outer positions and supply; legal onward ordinary exploration can reach middle/inner sectors from a remote outpost; Guardian opportunities do not bypass neutral rules; fixed deployed markers cannot be relocated or recovered; influence is paid; Guild ships are excluded from player pinning counts but remain vulnerable; portal paths charge only eligible traversals; fee and recipient previews agree with execution; normal links stay free; conquest changes toll eligibility; posted offers reserve inventory without duplication; partial fills conserve every resource; stale concurrent acceptance fails safely; cancelling and upkeep release escrow; all transfers survive replay and undo consistently.

## 6. Formics — Ender's Game

**Fantasy:** Mixed fleets move through hive coordination, giving larger ships a command role.

**Confirmed direction:** Start with only one cruiser, replacing the ordinary starting interceptor, and let larger ship classes coordinate movement for the immediate smaller class. Coordination applies to normal Move actions only. After reviewing the current Ragnarok behavior, the player chose to match it: a reaction after passing moves one ship without escorts.

**Confirmed first-version rule:** Replace the ordinary starting interceptor with one cruiser. When a cruiser moves, it may take up to two interceptors. When a dreadnought moves, it may take up to two cruisers. Each group consumes one movement activation.

Ships begin in the same sector and follow the same path to the same destination. Every ship must have enough movement. Validate the selected group atomically against normal fleet pinning and route restrictions: the fleet must be allowed to move that many ships out of the origin and through each intermediate sector. Sharing an activation does not bypass pinning. Do not chain escorts: cruisers accompanying a dreadnought cannot bring additional interceptors. Ordinary unescorted movement remains available.

There is no special Queen unit or fleet-collapse rule in this version.

**Player decision:** Build and maintain a mixed fleet to improve movement efficiency, while deciding how much force to concentrate in one convoy.

**Counterplay and risks:** Cheap coordinated movement can accelerate attacks and reinforcements. Concentration exposes the faction to threats elsewhere, and a slower escort constrains the shared route. Starting cruiser strength and movement efficiency must be balanced together.

**Remaining balance and interface work:** Starting economic offset and group-selection interface. Reaction exclusion is confirmed: the normal one-movement-activation reaction moves one ship without coordinated escorts. No recursive escorts apply during normal convoy movement.

**Existing-code observation:** Heralds of Ragnarok are the comparison faction with mixed Move/Build actions. At the reviewed revision, `rulesState.ts` explicitly suppresses their mixed-action budgets after passing. Do not assume that current behavior implements the player's example, and do not change Ragnarok as part of this proposal update. Formics must match that current behavior: no convoy coordination after passing. This supersedes the player's earlier reaction-inclusion preference, corrected at 12:44 America/Chicago.

**Acceptance scenarios:** Legal cruiser-plus-two-interceptor and dreadnought-plus-two-cruiser groups cost one activation; mixed origins, excessive escorts, inadequate drive range, pinned escorts, and recursive convoys are rejected before mutation; reaction movement cannot add convoy escorts; the starting fleet is exactly one cruiser; toll previews count every foreign convoy ship.

## 7. The Culture

**Fantasy:** Highly capable ships support both military intervention and valuable diplomatic relationships.

**Discussion status — Held:** The player has not read the series and wants to defer this faction until its theme can be judged. Exclude it from the first implementation roster. The four-mobile-ship cap and a small diplomacy bonus were rejected as too weak for this combat-heavy game. The replacement below is a candidate requiring further review, not an endorsed final statline.

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

**Confirmed direction:** Salvage should incentivize earlier combat and risk-taking. Neutral ships count, surviving retreat qualifies, and the Belters may scavenge wrecks they did not personally destroy, including by participating in a sector battle involving other fleets and then withdrawing.

**First-version rule — Salvage:** After a sector battle in which the Belters participated and at least one participating Belter ship survives, gain Materials for ships destroyed anywhere in that battle, regardless of who delivered the killing damage. Include neutral ships. Interpret the player's "scavenge any" direction as including friendly wrecks too; this interpretation is recorded rather than an additional confirmed statement about friendly ships. Retreating with a survivor qualifies even when another civilization holds the sector. Initial tunable candidate: one Material per destroyed ship, capped at three Materials per sector battle.

Settlement occurs once after the entire sector battle, including its sequential engagements, ends; materials are available for subsequent construction, not reinforcements within that battle. Count each destroyed ship ID once. Battle participation is required, but the Belters need not fire a shot or kill a ship. Wrecks from historical battles before their arrival do not count. A surviving withdrawal in an earlier engagement preserves eligibility for this battle's eventual settlement. No extra orbital subsystem is necessary to establish the core identity.

**Player decision:** Is this raid worth its losses even if the fleet must withdraw afterward?

**Counterplay and risks:** Destroying the entire raiding fleet prevents settlement. Retreat qualification must follow the battle's actual survivor record, not require ships to remain in the original sector. Friendly wrecks, inexpensive ships, staged battles, and frequent small encounters can favor salvage farming. Keep the payout below replacement value and use a battle-wide cap before adding restrictions that remove the intended third-party-scavenger strategy.

**Remaining balance and timing work:** Per-class payouts and cap; precise multi-engagement participation/survivor bookkeeping; reaction-battle timing. Neutral eligibility, surviving retreat, and attribution-independent sector-battle salvage are settled. Friendly-wreck eligibility is the explicit interpretation of "any" above. Settlement uses unique destroyed ship IDs and only one payout.

**Acceptance scenarios:** Victory and surviving retreat can pay; total Belter fleet loss cannot; neutral wrecks and kills made by other fleets count; friendly wrecks follow the recorded interpretation; earlier-engagement retreats remain eligible for battle-wide settlement; old battle wrecks do not count; the cap applies once per sector battle; repeated aftermath/reload cannot duplicate income.

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
6. **Culture — held:** Do not implement in this release. Revisit its thematic identity with the player before authoring a complete military/diplomatic statline.

Each implemented slice follows the repository's TDD, relevant tests, lint, build, and release process. Prototype availability remains opt-in until its complete player and AI flows are verified.

## Playtest acceptance and balance evidence

For every faction, require a successful full match, save/resume, multiplayer synchronization, legal AI play, and a player who can explain the signature rule after reading the faction sheet. Confirm that previews match authoritative outcomes and that existing factions and saves behave as before.

Measure signature-ability usage and unused opportunities, comprehension errors, action efficiency, early economic acceleration, fleet losses, research access, territory held, final score sources, and opponent responses. Compare multiple seeds, seat positions, player counts, opponents, and player skill; a few wins cannot establish balance.

| Faction | Specific evidence to collect |
| --- | --- |
| ExFor | Discovery variance; time to first valuable exploration/combat; generator-created routes and research discounts |
| Bobiverse | Production attributable to loaded interceptors; income gained without extra upkeep; factories lost and opposing targeting of loaded ships |
| Trisolarans | Reservations used, displaced research, effective denial duration, alternate-copy purchases, and once-per-round availability |
| Portiids | Encounters sought for learning; copied rare technology/parts; science paid; repeat acquisition and cooperative farming |
| Guild | Remote sectors held/lost; portal traffic and toll income; offers filled; resources received; competing routes; customer advantage |
| Formics | Ships moved per activation; convoy composition; offensive reach; pinning constraints; normal-versus-reaction movement distinction; opening cruiser value |
| Culture | Loadout dominance; military results; diplomatic VP share; relationship retention and betrayal decisions |
| Belters | Raids made earlier; salvage from retreat; fleet replacement; third-party salvage; friendly wrecks; payout caps; staged-battle incentives |

## Decision log and follow-ups

- Extra Bobiverse ships mean reserve component supply, not a larger opening fleet.
- Skippy's starting technology is Wormhole Generator. Guild infrastructure uses Warp Portals.
- Bobiverse's preferred distinction is population-bearing interceptors; an additional build-discount mechanic is omitted initially.
- Trisolaran surveillance is dropped. Technology reservation remains the core supported direction.
- Portiid copying includes rare research and ancient hardware; copying every discovery reward is outside the prototype.
- Guild includes remote prospecting, a limited portal network, ships that cannot pin, fixed paid transport, and finite 1:1 direct resource offers.
- Guild movement exceptions do not confer peaceful coexistence or shared player ownership.
- Formics use immediate-lower-class convoys, start with a cruiser, and do not use a Queen-collapse rule.
- Culture is held outside the first implementation roster pending thematic review; its previous four-ship cap is removed from consideration.
- Belter salvage rewards surviving battle participation and retreats; neutral and other fleets' kills qualify. "Any wrecks" is interpreted to include friendly ships, with a tunable cap. Mars is parked.

**Immediate follow-ups:** Prepare numerical starting sheets and a separately requested implementation plan for the seven active factions. Settle remaining physical-part repeat-acquisition policy without conflating one acquired component with a one-shot combat effect. Keep Culture held.

**Risks and rollback:** The main risks are early economic snowballs, oppressive market denial, staged encounter/trade incentives, multiplayer state complexity, AI undervaluing new mechanics, and incompatible variant behavior. Keep gameplay behind a new content-pack/rules version. A future rollback should disable the pack for new matches while preserving the versioned behavior of already-created matches.

**Document validation:** Check all eight proposed factions, explicit reserve-supply and portal terminology corrections, retained/deferred decisions, source file links, and Markdown structure. This change is a proposal and planning-log entry only; gameplay tests, lint, build, and deployment verification belong to a subsequent implementation change.


### Player decisions — October 9, 2026, 12:40 America/Chicago

- ExFor: accept the recommended draw-three/keep-two setup and normal rewards.
- Bobiverse: preserve normal combat; the firing side selects targets, including populated interceptors. Do not give the owner special casualty substitution.
- Trisolarans: accept the once-per-round short market reservation and Portiid bypass.
- Portiids: surviving retreat qualifies; acquired ancient hardware is one physical part with ordinary discovery handling. Further copies of a named part from separate encounters remain an explicit policy question.
- Guild: fixed permanent portal markers and legal outer remote placement. Ordinary onward exploration may reach sectors II and I, including legal opportunities around Guardian sectors in lower-player-count games.
- Formics: start with exactly one cruiser. Coordination applies to normal Move actions only; reaction movement after passing is one ship. This supersedes the 12:40 preference after the Ragnarok correction at 12:44. No recursive escorts.
- Culture: hold until the player is ready to review its thematic fit.
- Belters: neutral wrecks and surviving retreat qualify. Salvage counts battle-wide wrecks, including kills by others. The proposed reading of "any" also includes friendly wrecks; retain a cap and record that interpretation.
- Remaining quantities such as starting resources, copying prices, toll/offer limits, and salvage rates are prototype tuning rather than claimed balance.

## Repository references

- [Current game and supported modes](../README.md)
- [Faction registry and setup](../shared/eclipse/catalog.ts)
- [Technology effects](../shared/eclipse/technologies.ts)
- [Discovery effects and physical parts](../shared/eclipse/discoveries.ts)
- [Connections and pinning](../shared/eclipse/geometry.ts)
- [Action execution](../shared/eclipse/actions.ts)
- [Population income tracks](../shared/eclipse/tracks.ts)
- [Existing expansion assessment](second_dawn_faction_expansion_assessment.md)
