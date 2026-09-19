# Automatic reputation settlement

## Player outcome

Combat awards the best legal reputation result immediately. The player sees their private drawn tiles and selected tile without a mandatory picker or confirmation. Existing saved reputation choices resume through an authenticated command instead of blocking old matches.

## Rules source and preserved constraints

The publisher-verified [combat reputation rules](https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/HqhsukRTRo-Vp2FLZ_FU0g/reputation-tiles-1) cap each draw at five tiles and allow keeping at most one newly drawn tile. Players draw in sector entry order; unused tiles return before the next player draws. Full tracks can replace an existing tile. The user's requested digital convenience automatically chooses the highest-value legal result; the physical rule itself permits a choice.

The existing faction reputation-capacity calculation remains authoritative, including dedicated ambassador slots. Eridani's initial two private reputation draws remain setup behavior. Participation, kills, retreat penalties, draw ordering and seeded randomness remain unchanged.

## Implementation decisions

- `shared/eclipse/reputation.ts` computes the highest-value legal holding from existing tiles plus at most one new tile. Equal-valued old tiles win ties, so a full track with no improvement returns all new tiles. Exact tile multiplicities are conserved, including duplicate values.
- Fresh reputation awards settle directly in the combat engine. Each participant's unused tiles return to the finite supply before processing the next participant. Settlement creates no pending reputation decision.
- Optional `PrivateSeat.reputationSummary` persists the latest award's ID, round, battle/sector IDs, drawn values, selected value or null, final kept values and returned values. Only the owning player's private view receives this object. Public events describe automatic award completion without values; private events record the owner's result. The summary is additive and old snapshots remain valid.
- `DecisionChoice` retains `kind: 'reputation'` with optional `kept`. New clients resolve an old saved decision with no `kept` field. Older supplied selections still undergo capacity/provenance/one-new-tile validation, but settlement always keeps the best legal result, even when the old draft requested a lower tile.
- Legacy resolution uses the normal revisioned, ownership-checked `resolve` command and remains idempotent through the existing command journal. Queries never write or silently resolve decisions. An old reputation decision is finishable even when no active battle object remains in its saved snapshot.
- AI legal candidate generation exposes a single automatic reputation resolution for legacy saves. Existing action evaluation safely accepts omitted `kept` values.
- The parent/UI agent owns automatic legacy submission and the owner-only visual notice. This engine slice does not change combat dice timing or battle-result dismissal.

## Verification

Fail-first: all 19 initial behavior tests failed before implementation (`coding_agents/logs/auto_reputation_red.log`). Two existing battle assertions requiring a reputation prompt were deliberately replaced with automatic-summary assertions; the old-client two-new-tiles rejection remains covered.

- 29 new engine cases: all 12 base factions, 0–5 ambassador counts, draws of 0–5 tiles, supported 2–6 seat games, improvement/full/tied/empty capacity, exact multiset conservation, highest single draw, legacy lower draft, owner-only view/event filtering, public history filtering, stale/duplicate/identity rules and deterministic fresh battle replay.
- Bounded engine regression batch: 95/95 across six files, including complete seeded conservation/replay matches for every base faction (`auto_reputation_regressions.log`).
- Adapter regression batch: 13/13 across four files (`auto_reputation_convex.log`), including saved-decision restore, read-query immutability, omitted-kept transport validation, authoritative save/reload, duplicate receipt, and value-free public history.
- Typecheck, full lint and production build logs: `auto_reputation_typecheck.log`, `auto_reputation_lint.log`, `auto_reputation_build.log`. Final UI/browser and release gate results belong to the parent integration pass.

## Risks and rollback

The main compatibility change intentionally removes the ability to choose a lower-value reputation tile. Older valid drafts still complete with the best legal result. Pending old saves remain resumable through the same decision ID. Optional private summary fields require no destructive migration. Returning to manual selection would require restoring picker generation; saved tile values and conservation remain intact.
