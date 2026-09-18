# Second Dawn base-game rules audit

Audited 2026-09-07. This document records source evidence, implemented rule modules, and remaining corroboration. Release validation and completion gates are tracked separately in `second_dawn_status.md`. Existing application faction/rule data was not used as an authority.

## Sources and precedence

- [Publisher product page](https://en.lautapelit.fi/product/24681/eclipse-2nd-dawn-for-the-galaxy) links the 2021-04-27 English rules and lists physical components. Expansion rule links are separate.
- [Publisher-linked English rulebook, 2021-04-27](https://www.dropbox.com/scl/fi/wfua8sx8lyp2axor71cjx/Eclipse2_rules-ENG_2021-04-27_small.pdf?rlkey=e6kaj8wow8rykg2esfbk8ixw0&dl=1), pages 3–32. Both open-text and page-image PDFs downloaded. The page-image version avoids open-text rendering artifacts; pages 4–6, 9–10, 24, 26–29 and31 were visually reviewed. This is the primary version pinned by `RULES_VERSION`.
- [Dized rules index](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/eclipse-second-dawn-for-the-galaxy), used for source-specific corroboration. Its index also contains expansions, which must not be imported into the base catalog.

The 2021 PDF explicitly states that Draco ships are not pinned by Ancients (p27); the Dized faction summary omits that sentence. Prefer the publisher-linked revision where such wording differs.

## Verified catalog contract

`shared/eclipse/catalog.ts` exports `BASE_FACTIONS`, `FactionId`, `BaseFaction`, `PlayerCount`, `getFaction`, `validateFactionSelection`, `SETUP_BY_PLAYER_COUNT`, `BASE_COMPONENTS`, `STANDARD_CONSTRUCTION_COSTS`, `RULES_VERSION`, `CATALOG_VERSION` and `RULEBOOK_URL`.

The base-game catalog now includes faction setup, population, action constants, technologies, discoveries, sector faces, ship parts and all starting/neutral blueprints. Faction constants, technology identities/costs/effects and discovery inventory are publisher verified. Individual regular technology copy counts use an attributed community inventory; exact sector and blueprint fine print use reviewed physical component scans. Dedicated sector and ship audits preserve these source distinctions.

## Factions and physical board pairing

Each physical board has a Terran side and one alien side. Choosing either excludes its reverse in the same match (PDF p5). Pairings follow the color identification of the boards/portraits and home sectors on pp26–29. Controller type is unrelated to species identity.

| Color | Alien / home | Terran reverse / home |
| --- | --- | --- |
| Red | Eridani Empire / 222 | Terran Directorate / 221 |
| Blue | Hydran Progress / 224 | Terran Federation / 223 |
| Green | Planta / 226 | Terran Union / 225 |
| Yellow | Descendants of Draco / 228 | Terran Republic / 227 |
| White | Mechanema / 230 | Terran Conglomerate / 229 |
| Black | Orion Hegemony / 232 | Terran Alliance / 231 |

| Faction | Materials / science / money | Colony ships | Starting technology | Trade paid : gained |
| --- | --- | --- | --- | --- |
| [Eridani](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/QbIG-z7ERBCwxzDm0Nxn9g/eridani-empire) | 4 / 2 / 26 | 3 | Gauss Shield, Fusion Drive, Plasma Cannon | 3 : 1 |
| [Hydran](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/XHa1_pfWQz2xCoBnjnwZkw/hydran-progress) | 2 / 6 / 2 | 3 | Advanced Labs | 3 : 1 |
| [Planta](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/oo6qhIUtQAWUngwNsPsisw/planta) | 4 / 3 / 2 | 4 | Starbase | 3 : 1 |
| [Draco](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/y_M8UXNoRimWu306EmLEaw/descendants-of-draco) | 3 / 4 / 2 | 3 | Fusion Drive | 3 : 1 |
| [Mechanema](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/V4IDY4SxTS-on7Zg1qH4dw/mechanema) | 4 / 3 / 3 | 3 | Positron Computer | 3 : 1 |
| [Orion](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/GvE0RLjRSciZrzF9jhz_eA/orion-hegemony) | 4 / 3 / 3 | 3 | Neutron Bombs, Gauss Shield | 4 : 1 |
| [All Terrans](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/kIzVeVG5SWeVsb-DGaUkew/terran-factions-standard-information) | 4 / 3 / 3 | 3 | Starbase | 2 : 1 |

Default activations: Explore 1, Research 1, Upgrade 2, Build 2, Move 2, Influence 2. Exceptions: Hydran Research 2; Planta Explore 2; Mechanema Upgrade 3 and Build 3; Terran Move 3. Verified visually on PDF pp26–29.

Most factions start with 13 available influence discs, one placed on the home sector, leaving 12 on their influence track. Eridani starts with 11, leaving 10 after claiming home. Each color's additional three physical discs are reserved for Advanced Robotics / Quantum Grid, **not initially available** (PDF p5).

All start with an interceptor except Orion, which starts with a cruiser. Eridani draws two private reputation tiles before play. Starting technologies are printed on boards; do not remove matching market/bag tiles (see rulebook p10).

Standard construction materials: interceptor 3, cruiser 5, dreadnought 8, starbase 3, orbital 4, monolith 10. Mechanema pays respectively 2, 4, 7, 2, 3, 8 (PDF p27).

## Setup and supplies

| Players | Outer sector stack | Initial regular tech draws | Cleanup regular tech draws | Guardian starting sectors |
| --- | --- | --- | --- | --- |
| 2 | 5 | 12 | 5 | 4 |
| 3 | 8 | 14 | 6 | 3 |
| 4 | 14 | 16 | 7 | 2 |
| 5 | 16 | 18 | 8 | 1 |
| 6 | 18 | 20 | 9 | 0 |

[Sector setup](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/kiQflaZoQaehrBIVgWap0Q/2-sector-setup), [initial tech draws](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/5y9hnJ5RS8mhRGHo9I1tsQ/1-tech-and-reputation-tiles), [cleanup draws](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/-C8KxVgjT_a87sskofXx_g/cleanup-phase).

Rares drawn during initial/cleanup draws enter the market but do not advance the regular-draw counter. Rare market storage is not capped at seven slots (PDF p5).

Starting positions occupy six alternating sectors around the center as pictured p4. Home/guardian arrows point toward the GCDS. Empty starting positions contain random guardian sectors, each with one hidden discovery and a guardian. Center contains GCDS and one hidden discovery. Choose standard neutral blueprints by default; advanced versions are a supported base-box variation, not an expansion. STARTING_LAYOUTS translates these positions into flat-top axial coordinates with inward arrow directions; tests cover every player count. Exact per-tile wormhole masks are now encoded in `sectors.ts`; see `second_dawn_sector_audit.md` for component-image provenance.

Base sector inventory: Inner 101–110; Middle 201–211, 214, 281; Outer 301–318, 381–382; center 001; six double-sided homes 221–232; guardians 271–274. This totals 54 physical hexes. Warp portals are optional **base content**: exclude 281, 381, 382 when disabled; do not call these expansion hexes.

Each [civilization component set](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/kgNWdMktTc-gySdcY2wK6g/civilization-components) has 8 interceptors, 4 cruisers, 2 dreadnoughts, 4 starbases, 33 population cubes, 16 influence discs and 3 ambassadors. Box totals of 210 cubes include 12 damage cubes; they do not imply 35 population per player.

Physical box counts: 114 tech tiles (39 types), 282 ship-part tiles (24 types), 36 discoveries (24 types), 33 reputation tiles, 14 Ancients, 4 Guardians, one GCDS, 12 orbital miniatures and 10 monolith miniatures (PDF p3). Colony tiles: 19 ordinary plus 5 extra, explaining publisher total 24.

[Limited components](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/SlLlAv62Rd2RkwOxfGeg3w/limited-components): ships, population, influence, tech, discoveries, reputation, sectors, ambassadors. [Other components are unlimited](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/yw1o3k0GSAe8rUlp7ELopQ/unlimited-components), including ship parts, orbitals and monoliths. Physical counts must not become false gameplay caps. Resource storage is not capped at 40.

## Source-linked rule/test checklist

Status denotes evidence/implementation independently. Catalog tests live in `src/__tests__/second_dawn_catalog.spec.ts`.

| Rule/test area | Primary source | Current status |
| --- | --- | --- |
| Twelve faction options / mutually exclusive board colors | PDF pp5, 26–29 | Catalog + test |
| Setup resource and action-capacity exceptions | PDF pp26–29 | Catalog + test |
| Starting influence vs reserve components | PDF p5 | Catalog + test |
| Finite and unlimited component classification | PDF pp3, 7 | Catalog + test |
| Player-count draw/sector quantities | PDF pp5, 25 | Catalog + test |
| Initial population, advanced worlds and Hydran exception | PDF pp5, 26–29 page images | Catalog + test |
| Complete influence/income tracks | PDF pp4, 6 page images | Independently reviewed; implemented in tracks.ts + tests |
| Explore: two-sided wormholes, discard, exhausted stacks, Draco alternatives | PDF pp9–10 | Implemented in actions/decisions; actions and integration-review suites |
| Research: costs, discount minimum, rare placement, seven slots | PDF pp10–11, 31 | All39 cataloged; researchCost and action/rare-decision tests |
| Upgrade: energy, drive, removals, discovered parts outside grids | PDF p12 | Implemented blueprints/parts, ancientAcquisition and upgradePlan; dedicated behavioral suites |
| Build: prerequisites, pinning restrictions, structures | PDF p13 | Implemented actions; actions and integration-review suites |
| Move: range, connected edges, pinning, multi-ship activations | PDF p13 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Influence and colony activation | PDF pp8, 14 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Passing/reactions and first-pass bonus | PDF pp8, 14–15 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Diplomacy only with 4+ players; ambassadors and traitor transfer | PDF p15 | Implemented turn and end-of-combat windows; diplomacy-window, actions and integration-review suites |
| Combat ordering, initiative ties, missile timing | PDF pp18–20 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Manual hit allocation, retreat announcement/execution, stalemate | PDF pp18–20 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Reputation participation/destruction/retreat penalty and capped draws | PDF pp20–21 | Implemented battleEngine and reputation decisions; battle suite. Physical distribution corroboration remains separate |
| Population bombing, conquest, discoveries, repair | PDF pp9,21 | Implemented rounds and resumable discoveries; rounds/acquisition/rare-decision suites |
| Upkeep, bankruptcy choice, population returns, elimination | PDF p24 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Cleanup and round-eight completion | PDF pp25, 32 | Implemented; corresponding actions, rules, battle-engine, rounds and integration-review suites |
| Final VP and resource tiebreak | PDF pp3, 32 | Implemented scoring and rounds; seeded full-match and conservation suites |

## Faction exceptions covered by the rule implementation

- Eridani: two private starting reputation draws; reduced influence; permanent +1 energy on interceptor, cruiser, dreadnought.
- Hydran: populate its advanced science square at setup and resolve two research activations sequentially.
- Planta: two exploration activations; automatic loss of population to opposing ships during aftermath; +1 VP per controlled sector. All blueprints have lower initiative and fewer slots; ships have permanent +1 computer and +2 energy, starbase +1 computer and +5 energy (PDF p26).
- Draco: choose one or neither from up to two explored sectors; preserve discard order; coexist with and influence Ancients; never fight or be pinned by Ancients; no discovery collection while Ancients remain; +1 VP for every surviving Ancient on the board (PDF p27).
- Mechanema: three upgrades/builds and reduced construction costs, including structures.
- Orion: cruiser start; 4:1 trade; additional permanent energy 1/2/3 for interceptor/cruiser/dreadnought; increased blueprint initiative (permanent initiative3/2/1/4 for interceptor/cruiser/dreadnought/starbase).
- Terran: six identities share action/resource/blueprint behavior, 3 move activations and 2:1 trade.

## Current source-backed datasets

### Home population

`BaseFaction.startingPopulation` counts placed cubes; `normalHomePopulation` and `advancedHomePopulation` count printed squares. Verified from page-image PDF pp26–29. Hydran's sole science square is advanced and populated by its setup exception.

| Faction | Starting M/S/$ cubes | Basic M/S/$ squares | Advanced M/S/$ squares |
| --- | --- | --- | --- |
| Eridani | 0/1/1 | 0/1/1 | 0/1/1 |
| Hydran | 0/1/1 | 0/0/1 | 1/1/0 |
| Planta | 1/1/0 | 1/1/0 | 0/0/0 |
| Draco | 0/1/1 | 0/1/1 | 1/0/0 |
| Mechanema | 0/1/1 | 0/1/1 | 1/0/1 |
| Orion | 1/1/0 | 1/1/0 | 1/0/1 |
| Terrans | 1/1/1 | 1/1/1 | 0/1/1 |

### Starting layout

`STARTING_LAYOUTS` is a diagram translation using flat-top axial coordinates: screen `x=1.5q`, `y=sqrt(3)(r+q/2)`. Clockwise N/NE/SE/S/SW/NW coordinates are `(0,-2),(2,-2),(2,0),(0,2),(-2,2),(-2,0)`; each arrow faces inward. This is an implementation convention, not a rulebook coordinate system.

Player slots: 2p N/S; 3p N/SE/SW; 4p NE/SE/SW/NW; 5p all except S; 6p all. Remaining slots receive guardians. Human versus AI controller assignment does not alter layout. Exact edge masks are not inferred from arrow direction.

### Economic tracks

The publisher's open-text PDF rendered incorrectly in PyMuPDF. The [publisher page-image PDF, same 2021-04-27 revision](https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=1) made the following values legible; a second agent independently inspected the evidence.

- Income by removed population cubes0–11: `[2,3,4,6,8,10,12,15,18,21,24,28]` (p6).
- Printed influence slots, left to right: `[0,0,1,2,3,5,7,10,13,17,21,25,30]` (p4; the occluded third slot is corroborated p6).
- Upkeep indexed by empty influence slots0–13: `[0,0,0,1,2,3,5,7,10,13,17,21,25,30]`.

Research-granted discs stacked above the occupied leftmost influence slot do not create extra track positions. These arrays are implemented in `shared/eclipse/tracks.ts`.

### Technologies and inventory provenance

`shared/eclipse/technologies.ts` contains all39 names, categories, base/minimum costs and typed effects from PDF p31. `researchCost(technology,chosenTrack,researched)` checks seven-slot capacity, discounts `[0,1,2,3,4,6,8]`, minimum floors, cross-track duplicates and regular/rare placement. Include printed starting technologies in the supplied research list. Market stock, affordability, identity and action entitlement belong to the command processor.

The [BGG Second Dawn inventory](https://videogamegeek.com/wiki/page/thing:246900:moreinfo) explicitly lists `[5,5,5,5,4,3,3,3]` copies in ascending printed cost order for each regular category:33 each,99regular. These numbers are now encoded with `inventoryVerification:'community-inventory'` and a direct `inventorySource` URL. They were not inferred from first-edition counts. The source's authorship history was inaccessible; physical punchboard corroboration remains open.

The publisher independently verifies total114 (p3) and one copy of each of15rare technologies (p10). Rare entries therefore carry `inventoryVerification:'publisher-rulebook'`. The114sum and per-category copy distributions are tested. Do not describe individual regular multiplicities as publisher verified.

### Discoveries

`shared/eclipse/discoveries.ts` contains24types totaling36tiles, from [Dized Discovery Tiles](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/R2QHlAXtT2GyP-v4XJNiWA/discovery-tiles-1) and visually reviewed PDF p9. Quantities: three each of materials/science/money bonuses; two mixed bonuses; three Ancient Tech; three Ancient Cruiser; two Ancient Orbital; one Ancient Monolith; fourteen different grid ship parts; one Muon Source; one Ancient Warp Portal. Together these reconcile p3's36tiles/24types.

Every tile offers a2VP alternative. Exact bonuses are6materials,5science,8money, or2materials+2science+3money. Ancient Orbital also grants2materials. Ancient Tech selects the lowest printed-cost unowned regular market technology, with player choice among ties. The14grid parts are unique; Muon Source goes outside the grid. Ancient parts may be stored and are removed from the game when removed from a blueprint. Ancient Warp Portal is base-box content and provides2VP to its sector's controller.

Typed effects describe acquisition; they do not replace full part combat statistics or resumable choices. Placement rewards normally target their discovery sector. Ancient Labs placement targets the starting sector, requiring the2VP alternative when that sector is not controlled (p30 FAQ).

### Blueprint evidence

Complete starting blueprints for all base factions, nine standard/advanced neutral variants, and all39 ship parts are now encoded in `shared/eclipse/blueprints.ts` and `parts.ts`. The initial tentative starbase initiative reading was corrected: normal permanent initiative is2/1/0/3; Orion is3/2/1/4. Every faction was checked against physical component scans, with supplemental source provenance recorded in `second_dawn_ship_audit.md`. The publisher rulebook supplies legality and part mechanics; fine-print statistics use explicitly attributed component-image evidence.

## Verification and decisions

Catalog, technology and discovery tests were each written before their implementation and initially failed. Current focused suites cover setup metadata, player-count layouts, basic/advanced population, all technology costs and copies, pricing legality, discovery conservation and special acquisition effects. Focused ESLint passes. Global integration/build gates belong to the supervisor's status report.

1. Rules and catalog versions are pinned separately. These datasets do not establish complete-game compliance.
2. Treat physical counts separately from rule limits; preserve research-only influence reserves and unlimited structures/parts.
3. Record source strength per field: primary rules for gameplay/costs, explicitly attributed supplemental inventory for regular technology copies.
4. Remaining source corroboration: regular-technology per-type punchboard counts and reputation distribution. Sector masks/content and all-faction blueprints/parts are now encoded; see the dedicated sector and ship audit records for their source tiers.
5. Authoritative actions/combat/upkeep/diplomacy, AI and guest persistence are integrated. Full-match, replay and conservation tests exist. Current release gates, browser results and remaining usability evidence are recorded in `second_dawn_status.md`, rather than inferred from catalog tests.

## Late audit: co-located warp portals and unfulfillable Ancient Tech rewards

**Warp portal co-location.** Publisher rulebook p11/31 instructs placing the researched Warp Portal Tile on any controlled sector. Page9 places Ancient Warp Portal in the sector where found; p30 places Ancient Labs location-dependent rewards on the player's controlled starting sector. Neither p7's module rules nor these placements forbids a sector that already has a portal. Consequently the engine's prior one-portal-per-sector restriction had no source and should be removed. Both physical portal awards may coexist, including on a printed portal sector. Their separately awarded1VP and2VP add to3VP on the same controlled sector. This addition is an inference from the independent printed awards, **not an explicit FAQ quotation**. Base sector printedVP remains separate. Sources: [publisher raster PDF pp7,9,11,30–31](https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=1), [publisher-verified Dized Warp Portals](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/StdgE5rdTcmgynp1Py06NQ/warp-portals).

**Ancient Tech with a full track.** Publisher p9 specifies the lowest printed-cost regular technology in the market that the player does not already have, with player choice among ties. It does not say "the cheapest technology you are able to research." Page10 prohibits placing technologies on a full track. No primary exception authorizing a more expensive reward was located. Therefore select the globally cheapest unowned regular cost first, then offer only tied candidates that fit a nonfull matching track. If none fit, the reward cannot be legally performed: show only the universal2VP side before committing the discovery choice. This is an implementation inference combining the two rules, and remains distinguishable from an explicit publisher edge-case ruling. Do not silently skip to a more expensive technology. Recovering a preexisting already-committed unfulfillable reward as2VP is a migration/recovery policy, not a quoted official rule. The same keep-only availability principle prevents finite component reward choices from becoming persisted dead ends. Source: [publisher PDF pp9–10](https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=1).

**Warp Portal research without controlled territory.** Page11 makes placement on a controlled sector mandatory and supplies no discard/forgo alternative. To avoid an impossible outstanding choice, research is unavailable until the player controls a sector. This is a conservative legality inference from the mandatory effect, not an explicit publisher precondition or FAQ ruling. Owning ships alone is insufficient to fulfill the placement.
