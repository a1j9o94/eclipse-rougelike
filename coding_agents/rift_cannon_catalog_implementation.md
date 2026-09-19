# Rift Cannon catalog and setup

Outcome: players can research Rift Cannon and discover Rift Conductor in new module-enabled games, with source-verified costs and finite draw supplies; existing games retain their setup and version pins.

## Sources and decisions

- [Publisher Second Dawn Rift Cannon rules](https://www.lautapelit.fi/files/Online%20rules/Eclipse2_RC_rules_web.pdf), page 1. Local copy: `/Users/oblet/Downloads/Eclipse2_RC_rules_web.pdf`. Read actual rendered page and enlarged printed technology tile; cost **9**, minimum **7**.
- Rift Cannon is a singleton rare technology. Its ship part consumes 2 energy and has one special magenta die. Rift Conductor is a unique discovery, with 1 hull, 1 energy consumption and one special magenta die. Discovery follows normal install/store/2 VP alternative behavior.
- [Publisher product](https://en.lautapelit.fi/product/30382/eclipse---2nd-dawn-rift-cannon) lists ten ship-part tiles; combined with the unique Conductor this means nine physical regular Cannon parts and one Conductor. Physical regular parts remain unlimited by base rules, so nine is **not** a gameplay installation limit.
- Catalog entries carry `expansion: 'rift-cannon'`; source metadata links the publisher PDF. Magenta's nominal weapon damage field is 1 solely for the existing weapon contract; combat resolves its actual face-specific enemy/self damage separately.
- Setup opt-in is `GameSetup.riftCannons`. Omission preserves existing deterministic fixtures and saves. Enabled setup has 115 technology tiles and 37 discoveries before optional warp exclusions. Draw quotas still count only regular technologies.
- Module-enabled games pin both rules/catalog versions with `+rift-cannon-v1`. Server command acceptance and historical recovery select the correct pin from persisted `engine.riftCannons`. No migration inserts new tiles into old bags.

## Acceptance and verification

- Six new failing tests were run first: absent technology/parts, unchanged supplies, missing version separation all failed as expected.
- The six pass after implementation: printed pricing/discount floor; part stats/access; unique discovery; opt-in supplies/reproducibility/warp exclusions; rare draw quota; base and expanded roster version isolation.
- Relevant catalog batch: **5 files, 41 tests passed** (`second_dawn_rift_catalog`, `second_dawn_technologies`, `second_dawn_discoveries`, `second_dawn_blueprints`, `second_dawn_supplies`). Existing base catalog assertions filter expansion-marked entries, preserving base component counts.
- `git diff --check` passed. Supervisor owns final lint/build and integration validation.

## Risks, rollback and follow-ups

Combat must interpret magenta specially; AI hypothetical worlds must opt into the same module as the match. Live new-match/room setup must pass true explicitly. These integrations are assigned to the supervisor and other agents. Rollback new match activation by omitting the module flag; do not remove catalog readers while persisted module-enabled games exist.
