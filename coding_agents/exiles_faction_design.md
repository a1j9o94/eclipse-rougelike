# The Exiles: official Outcasts faction

## Outcome

Players can choose The Exiles, build and populate Orbitals, defend them as ships, and score their printed Orbital bonus.

## Acceptance criteria

- Sector 234, setup resources, action counts, starting Orbital, Orbital and Cloaking Device technologies match the archived Outcasts rules sheet.
- A populated Orbital participates in combat with an editable stationary blueprint. Destroying it returns its cube to the matching graveyard and leaves the Orbital structure in place. Its opponent receives one extra reputation draw, subject to the existing five-draw cap.
- Each populated Orbital controlled by Exiles scores one VP. Unpopulated Orbitals do not.
- Exiles cannot build Starbases; all existing factions and saved base games keep their rules.

## Risks and rollback

The engine has four player ship types. Exiles' Orbital uses the unused Starbase blueprint and is distinguished by an `orbitalShip` flag on persisted ship instances. This limits type churn but requires every ship-removal path to preserve the cube and structure rules. Roll back the feature branch if that integration proves incomplete.

## Test list

- [x] Failing first: faction setup and scoring tests in `second_dawn_exiles.spec.ts`.
- [x] Colonization and abandonment lifecycle, Starbase prohibition, blueprint stats.
- [x] Deterministic combat casualty test, cube return queue, and extra reputation draw value. The existing battle engine caps all draws at five.
- [x] Seeded eight-round AI game including Exiles.
- [ ] Multiplayer recovery test.

## Decision Log

- Transcribed the archived `04 The Exiles Outcasts rules.jpg`, board, and sector image. Printed resources are 4 Materials, 2 Science, 3 Money; three colony ships; sector 234; Orbital and Cloaking Device; action counts 1/1/2/2/2/2.
- Reuse the Starbase blueprint slot for the Exiles Orbital. Exiles cannot construct Starbases, so the slot identifies only their stationary Orbital class. The combat instance has `orbitalShip: true` and the structure remains on the sector after that instance is destroyed.
- Place printed rare Cloaking Device on the Nano technology track at setup, because the engine stores researched technologies on three standard tracks.

## Follow-ups

- Verify combat casualty and reputation timing with a deterministic fixture.
- The archived board labels the Orbital blueprint with 2 initiative and 4 energy. Its three printed parts are Ion Turret, Electron Computer, and Hull; those values are encoded in the catalog and verified by the Exiles test.
- Combat playback carries Orbital identity in recorded volleys so the correct label and ring silhouette remain after its ship is destroyed.
- The parent integration must pin the prior expanded-v1 roster and place Exiles in the new versioned profile.
