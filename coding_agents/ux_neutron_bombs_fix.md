# Neutron Bombs investigation

## Outcome

No engine calculation defect was reproduced. The reported partial destruction came from presenting automatic Neutron Bombs as generic per-cube hit assignment. The panel now treats the technology as one clear all-or-spare choice.

## Acceptance criteria

- Neutron Bombs offer one automatic population hit per enemy cube without rolling dice.
- With active Neutron Bombs, the panel initially previews destroying all eligible population and lets the player instead spare it all.
- Ordinary bombardment and the Neutron Absorber fallback retain manual optional targeting.
- Neutron Absorber continues to fall back to normal cannon bombardment rolls.
- Planta population continues to use its faction exception.
- The UI identifies the choice as an optional population attack.
- The Neutron Bombs explanation is suppressed when the defender has Neutron Absorber.

## Tests

- [x] Neutron Bombs create automatic hits for every cube without consuming randomness.
- [x] The player can select a population target and submit it.
- [x] The decision starts valid with no targets, preserving the rulebook opt-out.
- [x] Active Neutron Bombs are identified as automatic and no-roll.
- [x] Neutron Absorber suppresses the automatic Neutron Bombs explanation.
- [x] Active Neutron Bombs hide individual population checkboxes, initially select all targets, and offer an explicit spare choice.
- [x] Duplicate targets remain rejected.

## Decision log

The [official April 27, 2021 English rulebook](https://www.dropbox.com/scl/fi/gw0xv0um7ami1952be59o/Eclipse2_rules-ENG_2021-04-27_web200.pdf?rlkey=8b8dymg6fbzkj8umjiunjgp1s&dl=0), linked by publisher Lautapelit, says on page 21 that each ship “may attack once” and that with Neutron Bombs all population cubes “may be destroyed automatically.” The optional language applies to both normal attacks and Neutron Bombs. The existing engine validation and the zero-target command in `legal.ts` are therefore correct. The AI already prefers destroying more cubes, scoring each selected target positively.

No backend restriction was added. The rulebook permits ships to make their normal population attack, so the engine continues accepting partial target lists for compatibility with that route. The dedicated Neutron Bombs UI exposes the automatic technology outcome as all-or-spare and prevents the confusing partial automatic choice reported by the user. No ship-combat behavior changed. Neutron Bombs affect population at the end of the Combat Phase, not ships during battle.

## Follow-ups

Ask the reporter whether they expected ship damage or missed the post-battle population decision. If population targets never appeared after an occupying ship survived, capture the saved state so the occupancy, defender technology, faction exception, and aftermath cursor can be inspected.
