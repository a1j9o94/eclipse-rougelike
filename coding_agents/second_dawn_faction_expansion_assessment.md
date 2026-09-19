# Faction expansion assessment — September 19, 2026

## Outcome
Expand the selectable faction roster while preserving readable faction identity, fair AI, existing saves, and the current 2–6-player match format.

## Current implementation
- `shared/eclipse/catalog.ts`: closed 12-ID union; six alien and six Terran entries. Definitions supply starting economy/population/techs, activation counts, trade, construction costs, home-sector references, and basic supplies.
- `shared/eclipse/blueprints.ts`: printed loadouts and permanent stats contain faction-ID conditionals.
- Special rules also live in setup, actions, legality, combat/reputation, rounds, scoring, and AI. Examples include Draco/Ancient interaction, Planta scoring, and reputation-slot layouts. Adding a definition alone cannot implement arbitrary abilities.
- Picker/lobbies enforce six unique board colors; symbols and ship design families derive from those colors. Roster identity must be separated from seat color to support many distinct choices cleanly.
- Server faction validators and solo/room AI faction selection are closed to the base catalog.
- Matches store rules/catalog versions, but current command handlers pass the current global versions. Expansion changes need an explicit compatibility strategy rather than merely increasing version strings.

## Suggested sequence (not yet authorized for implementation)
1. Obtain exact requested factions, rule sources, and editions/variants. Inventory required mechanics and dependencies before estimating individually.
2. Introduce a faction registry with source/edition/content-pack metadata, setup/blueprint definitions, explicit supported abilities, and presentation identity independent of player color.
3. Move existing special-case behavior behind typed, tested ability helpers. Reuse these helpers across legality, execution, AI, previews and explanations.
4. Add a searchable visual roster, source filters, and room-level allowed packs. Retain 2–6 players unless separately requested.
5. Implement a small representative first batch, including a distinctive ability, to validate the architecture before importing the whole roster.

## Acceptance and fail-first tests
- Existing faction setup, legality, scoring and blueprint fixtures remain unchanged.
- Each new faction has verified setup/components, ability scenarios, public/private view checks, resumable decisions where needed, and full-match AI coverage.
- Distinct selected factions remain identifiable despite configurable seat colors; server and client agree on valid selections and allowed content.
- Existing saved matches continue accepting commands; new faction support does not silently change their rules.
- AI both submits legal actions and understands any new mechanic's value; legal compatibility alone is not sufficient.

## Effort and risks
Numeric changes and already-supported effects are the easiest category. New combinations of existing systems require moderate rules/UI/AI integration. New resources, piece types, tracks, or decision phases would be substantial engine features. Actual classification of the user's approximately 15 factions awaits their list and exact sources. Community variants must be explicitly identified; no faction values or edition compatibility have been assumed.

## Decision log / follow-ups
Assessment only; no gameplay implementation or deployment. Obtain the user's list, then produce a per-faction dependency/effort table. Roll out incrementally with packs disabled by default where appropriate; preserve existing catalog behavior for rollback and save compatibility.
