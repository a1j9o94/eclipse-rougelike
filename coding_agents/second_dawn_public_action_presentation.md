# Public action presentation metadata — 2026-09-08

Outcome: the AI activity interface can show actual public technology, ship classes, built components, and affected sectors for an accepted action.

## Contract

`PublicHistoryEntry.presentation` is optional. `PublicActionPresentation` is a strictly typed discriminated union:

- Research: catalog-validated technology ID.
- Upgrade: deduplicated public ship classes submitted for upgrade.
- Build: public sector references and component counts grouped by component type.
- Move: deduplicated public ship references and the ordered, deduplicated sectors in the traveled paths.
- Influence and colonization: public affected sector references.
- Exploration: a selected sector only after accepted placement exists on the public galaxy.

Upgrade metadata identifies classes, not historical loadout snapshots. A renderer that reads the latest player view must label those blueprints as current public loadouts. Move paths omit the departure sector because existing commands do not record it; the renderer must not treat the first path destination as the origin.

## Privacy and compatibility

The projector receives accepted journal entries. Research, upgrades, builds, moves, influence, and population placement are public actions. Sector and ship references are filtered against the supplied public board context. Missing historical entities produce empty reference lists. Missing context and older journals remain supported.

Raw commands, decision IDs, funding payloads, blueprint part payloads, and hidden choice data are not forwarded. Initial exploration, a second draw, discarded sectors, discoveries, reputation selections, reputation discards, and other private decisions do not gain metadata. Exploration placement requires a non-null selected tile, no second draw, and a matching tile already present in the public context. Resolved colonization choices expose only sector references from the accepted public placements.

The existing optional-free entry shape remains unchanged when no presentation applies. Existing summary/details redaction still filters private events. The research projection's explicit shape test was updated to allow exactly the new typed field and verify its contents.

## Verification

Six new failing-first behavioral tests cover funded research, public ship classes, grouped construction, repeated move activations, reference filtering, placement versus hidden exploration, private choice omission, and no-context journal compatibility. The presentation/history/Convex-history batch passes 14 tests. Scoped lint and Eclipse TypeScript pass; build and repository lint evidence are in the logs below.

Evidence: `coding_agents/logs/second_dawn_history_presentation_red.out`, `second_dawn_history_presentation_green.out`, `second_dawn_history_presentation_lint.out`, `second_dawn_history_presentation_types.out`, `second_dawn_history_presentation_build.out`, and `second_dawn_history_presentation_full_lint.out`.

No schema or stored journal changes were made. Supervisor owns the action-panel integration, browser review, and deployment.
