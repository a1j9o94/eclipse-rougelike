# Minor Species engine — verified implementation

## Outcome and acceptance

Players may opt into the official Second Dawn Minor Species module, purchase visible allies during their own action turns without using influence/activations, immediately receive their benefits, and score them accurately. Old games retain their setup seeds, inventories and rules pins. Human and AI purchases use the same authoritative commands, prices and private reputation-slot rules.

## Source verification

Primary source: [publisher Second Dawn Minor Species rules, 2019, page 1](https://www.lautapelit.fi/files/Online%20rules/Eclipse2_MS_rules_web.pdf). Rendered and visually inspected the PDF's actual tile images and ability text at `/tmp/minor-species-0.png`. The sheet shows all nine costs; no costs were inferred from first-edition content.

| Descriptive ID | Money | Effect / final VP |
| --- | ---: | --- |
| reputation | 8 | 1 VP per retained reputation tile, regardless of its value |
| ambassadors | 4 | 1 VP per ambassador, including Minor Species and itself |
| prestige | 8 | 3 VP |
| population | 9 | Move a chosen available resource population cube onto this tile immediately; 1 VP |
| cruisers | 4 | Cruiser construction −1 material each; 1 VP |
| dreadnoughts | 4 | Dreadnought construction −2 materials each; 1 VP |
| orbitals | 4 | Orbital construction −1 material each; 1 VP |
| monoliths | 6 | Monolith construction −2 materials each; 1 VP |
| researchers | 4 | Research −1 science, respecting printed minimum costs; 1 VP |

These tiles have no printed species names. Catalog names are descriptive interface labels, not purported official faction names. The module selects four distinct tiles randomly during setup; no replacement market draws. A player may retain multiple Minor Species. They cannot be discarded. The explicit 2–3 player exception applies to this module.

Base rulebook cross-check: local `.second-dawn/faction-research/originals/Rulebooks/eclipse-2nd-dawn-rules-eng-2020-03-13-web200-searchable.pdf`, pages 15 and 26–29. Read text and rendered physical reputation-track diagrams. Page 15 prohibits the traitor from forming Diplomatic Relations, so Minor Species purchases preserve that prohibition; the supplement provides no exception. Spaces:

- Eridani, Draco, Mechanema: four shared ambassador/reputation spaces.
- Hydran, Planta: three shared spaces and one ambassador-only space.
- Orion: four shared spaces and one reputation-only space.
- Terrans: four shared spaces and one ambassador-only space.

Added Orion's previously implicit `dedicatedReputationSlots: 1` to the reviewed catalog. Minor Species and normal diplomacy use the same compatible-space limit; Orion's fifth reputation space cannot hold an ambassador. Minor Species do not consume the player's supply of ordinary outgoing ambassador tiles.

## Contracts and behavior

- Optional `GameSetup.minorSpecies`; state/view `minorSpecies: { market }`; seats retain `{ id, resource? }[]`.
- `buy-minor-species` includes ID, optional population resource, and optional private `returnReputation` VP values. It validates active turn, action phase, no pending choice, available tile, traitor restriction, exact money cost, compatible slots, and available population.
- A full reputation rack can return the exact required number of owned reputation tiles atomically with purchase. Candidate generation proposes the lowest values. Public events/history never expose those values. Ordinary diplomacy cannot displace permanent Minor Species.
- Purchase consumes no action activation, influence disc, or colony ship and preserves current mixed-action budgets. A passed player on their action turn may purchase while retaining passed status.
- `researchCostForSeat` and `constructionCostForSeat` serve authoritative execution, legal candidates, resource funding and previews. Effects apply immediately; science minimums remain in force and each matching constructed component receives its discount.
- `minorSpeciesPoints` calculates the separate optional scoring category. The reputation species uses a public count, never opponents' private values. Ordinary ambassador VP remains separate so fixed Minor Species VP is not doubled.
- Setup shuffles nine IDs and retains four only when enabled, after prior setup draws; absent/false does not change historical random draws or optional fields. Enabled rules/catalog pins append `+minor-species-v1`, including when Rift is enabled. Historical checkpoint reconstruction passes this opt-in through exact replay.

## Validation evidence

Tests were written before implementation: the new module failed to resolve initially; a later purchase-preview regression reproduced unchanged money (30 instead of 21) before the projection fix.

46 tests passed across:

- `second_dawn_minor_species.spec.ts`: 14 tests covering nine costs, finite seeded selection, opt-out compatibility, no action/turn spend, immediate research/build reductions and minimums, population placement, atomic private rack return, invalid-command immutability, own-turn/phase/pending checks, public scoring, duplicate/stale submissions, Orion's reputation-only space, traitor restriction, passed status, preview/funding parity, exact historical purchase replay with Rift both disabled/enabled, and ordinary diplomacy capacity.
- Existing history recovery (7), funding (5), blueprints (10), technologies (8), traitor review (2).

Shared TypeScript and touched-file ESLint passed. Root owns the final combined full lint/build and deployment gate after UI/backend/AI integration. No commit, push or deployment performed by this sub-agent.

## Risks and rollback

Purchases are permanent by the printed rule, so UI must clearly show money, population choice and any returned reputation before submission. Traitordom prevents new purchases but does not remove already acquired Minor Species. Roll back this optional module as a coordinated versioned feature; do not strip fields from an existing enabled save. Old disabled matches require no migration. No unrelated expansion rules or component values were added.
