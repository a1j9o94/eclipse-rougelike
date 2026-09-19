# Rift Cannons and Eclipse dice

Outcome: new games include the Rift Cannon mini-expansion, with correct research/discovery effects, special rolls, compulsory backfire, and readable Eclipse dice in combat.

Sources: publisher [Rift Cannon rules](https://www.lautapelit.fi/files/Online%20rules/Eclipse2_RC_rules_web.pdf), page 1, visually read from the supplied local PDF; [product contents](https://en.lautapelit.fi/product/30382/eclipse---2nd-dawn-rift-cannon). Base combat/component rules remain applicable.

Acceptance:
- Rare technology costs 9/7; cannon consumes 2 energy; Rift Conductor gives 1 hull and one Rift die for 1 energy.
- Two blank faces; one enemy damage; two enemy damage; three enemy plus one self damage; one self damage. Computer/shield modifiers do not apply.
- Pool backfire across the activated ship class and assign only to friendly Rift-equipped ships in the sector, destroying largest possible ships first, otherwise damaging largest ships.
- Simultaneous outgoing damage survives firing-ship destruction; casualties are visible and resumable rolls deterministic.
- Ordinary dice use blank1, numbers2–5 and damage bursts6; Rift dice use filled/hollow damage bursts in 2D and 3D.
- New live solo/room matches include expansion; pre-expansion supplies and pinned history remain unchanged.
- AI and battle estimates evaluate Rift damage/backfire using independent simulation randomness.

Fail-first tests: six engine tests failed before implementation (face table, allocation priority, persisted roll, simultaneous casualties, atomic rejection, eligible backfire ships); catalog/UI/AI agents own their behavioral tests. Relevant batches only; lint and production build gates.

Risk/rollback: new optional save marker/version pins; do not inject components into ongoing matches. Revert the new-game enable flag to stop creating expansion matches while retaining compatibility with existing saves. Cosmetic dice updates never generate outcomes.

Delegation: catalog/setup, UI/dice, and AI simulation agents work in disjoint files; supervisor owns authoritative combat and integration.

Follow-up requested during implementation: audit archived Drive strategy notes using a Sol agent, then implement gaps separately from Rift support.

## Implementation and verification

- Catalog and new solo/room matches include one Rift technology and one Rift Conductor discovery. Existing saves retain their bags and version pins.
- Engine resolves every die in the activated ship class before applying pooled compulsory backfire. Opponent destruction credit includes backfire losses during battle; mutual destruction still settles both participants' reputation. Population attacks also roll special faces, apply backfire once and persist their pending population selection.
- History recovery initially failed three existing server tests because reconstruction omitted the module flag; passed after restoring it. Starter-seed test helpers now account for the extra shuffled components rather than assuming the old bag's RNG draw count.
- Final core batch: 41 tests across battle engine, rounds and Rift combat. UI/combat batch: 65 tests across 12 files. Catalog agent batch: 41 tests across five files. AI agent batch: 57 tests across five suites. Counts overlap and must not be summed as unique tests.
- Protocol/ownership/rooms/history/starter checks: 54 tests across eight files, with four failures isolated, corrected and rechecked in the relevant three-file /19-test batch. New pinned room commands, duplicate/stale handling, and historical base saves are exercised.
- Five Rift-enabled eight-round seeded matches (2–6 seats) completed with valid scoring, approximately9 seconds combined locally. This is correctness/deadlock coverage, not a strength benchmark.
- Repository lint, Convex codegen, application/domain TypeScript and Vite production build pass. Existing Browserslist-age and bundle-size warnings remain.
- Actual desktop/mobile combat and printed/3D dice screenshots reviewed; evidence and capture correction recorded in [visual validation](rift_cannon_visual_validation.md). No user playtest claimed.

Separate worktrees: `feature/wooden-atlas-redesign` at `/Users/oblet/Documents/GitHub/eclipse-atlas-redesign`; Sol CLI agent on `feature/drive-ai-heuristics` at `/Users/oblet/Documents/GitHub/eclipse-ai-heuristics`. These are excluded from the Rift release. Sol process/log recorded under that worktree's `coding_agents/pids` and `coding_agents/logs`.
