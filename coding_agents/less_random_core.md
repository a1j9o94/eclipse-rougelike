# Less Random core delivery ledger

## Outcome

`less-random-v1` is an additive game mode that exposes the variant's shared supplies and applies its deterministic setup, exploration, research, scoring, and round rules without changing historical standard matches.

## Acceptance criteria

- [x] Missing `rulesMode` continues to mean standard rules.
- [x] Setup has all legal technology tiles available, removes the three banned rare technologies and optional warp sectors, and makes every outer sector available.
- [x] Exploration draws two sectors (three for Draco), supports a single redraw token, and enforces outer-sector placement limits.
- [x] Discovery and reputation supplies are public in the player view.
- [x] Ten rounds are played and an unused exploration token awards 2 VP.
- [x] Variant trade ratios and development/technology hooks have mode-aware core interfaces.

## Source implementation decisions

Eridani printed setup draws use the same face-up reputation choice and upgrade costs as later reputation awards; no hidden value is assigned. Magellan selects a face-up discovery at setup and reserves it until its fourth-technology trigger, preserving delayed-reward timing.

The first-round two-outer allowance applies to the catalogued Planta and Legion of Midas factions.

## Targeted validation

- [x] `second_dawn_supplies`, `second_dawn_actions`, and `second_dawn_rounds` pass.
- [x] ESLint passes.
- [x] Bounded Less Random AI matches complete for two through six seats.
- [x] Core regressions cover exhausted public discovery supply, rejection immutability/RNG preservation, deterministic setup-choice replay, and physical discovery/technology inventory.
- [x] Public reputation count mirrors the canonical Less Random reputation supply after an add and return.
- [x] Magellan’s public reservation clears at fourth-technology redemption and is reconstructed in fair AI worlds for every viewer.
- [x] Stale queued public-discovery snapshots are discarded when the public supply is empty.
- [x] Exploration tests cover two/three-tile draws, one-use deterministic Joker redraws, first-round Planta/Midas allowances, per-player caps, and the printed global outer cap.
- [x] Trade tests cover 3:2 odd quantities and 2:1 fallbacks/amendments. The supported faction roster has no printed rare starting technology, so the source's additional rare-start supply removal rule is presently inert.

## Follow-ups

- Verify the supplied component artwork against the text-only May 2026 source before adding any further faction-specific mapping.
