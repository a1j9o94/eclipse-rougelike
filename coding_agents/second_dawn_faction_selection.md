# Second Dawn faction selection

## Outcome

Make the starting civilization choice understandable before a player knows the
rulebook. The selector presents each physical base-game board as its alien and
Terran sides, then expands only the chosen side into its starting economy,
technologies, blueprint distinction, advantages, and restrictions.

## Component contract

`FactionPicker` is deliberately independent of match creation and can be used
by solo and future multiplayer setup:

```ts
interface FactionPickerProps {
  selected: FactionId;
  onSelect: (faction: FactionId) => void;
  disabled?: boolean;
  unavailableColors?: Partial<Record<CivilizationColor, string>>;
}
```

`unavailableColors` operates on a physical board color, so it disables both
sides and displays the supplied seat-conflict reason. It does not infer
availability or change the authoritative setup rules.

The selected detail uses `factionPresentation(faction)`, a typed UI helper.
Starting resource values and technology cards come directly from
`BASE_FACTIONS` and `TECHNOLOGIES`; starting ship distinctions and permanent
blueprint statistics are derived from `blueprintDefinition`. No catalog or
game-rule data changed for this UI work.

## Source verification

| Displayed fact | Verified source | UI treatment |
| --- | --- | --- |
| Six shared-color alien/Terran board pairs and home sectors | `second_dawn_rules.md`, Factions and physical board pairing (PDF pp5, 26–29) | One compact two-button color board |
| Starting resources, colony ships, technologies, trade ratios, ship starts | `BASE_FACTIONS`; source table in `second_dawn_rules.md` | SVG resource counters and actual `TechnologyStats` cards |
| Extra activations and faction restrictions | `second_dawn_rules.md`, Faction exceptions covered by the rule implementation | Selected-side effect and constraint cards |
| Orion, Eridani, and Planta permanent blueprint strengths | `blueprints.ts`, corroborated in `second_dawn_rules.md` and ship audit | Starting-ship stat summary |

The presentation calls out the consequential exception rather than trying to
copy all board text: Eridani reputation and reduced influence, Hydran's
advanced science and two research activations, Planta population risk and
sector scoring, Draco's Ancient rules, Mechanema costs and activations,
Orion's cruiser/energy/initiative/trade, and Terran move/trade flexibility.

### Wording audit

The UI copy was checked against the executable branches before release. Planta
has **2 Explore activations**, rather than an action that somehow repeats
itself; its population is destroyed at the end of combat only when an
opponent's ships occupy the sector. Draco may draw a second sector, then must
choose one drawn sector or discard both. Mechanema's three Upgrade activations
limit **part installations** across its edited blueprints; removals are free.
These details are exercised in the focused presentation test so a future copy
edit cannot reintroduce the misleading shorthand.

## Interaction and accessibility

- Every selectable faction is a native button with an accessible board/color
  name and an `aria-pressed` selected state.
- Color conflicts are native disabled buttons with a visible reason; no color
  alone conveys availability or selection.
- The paired cards remain compact; only the chosen faction has expanded detail.
- Existing SVG stat and planet icons represent resource and effect concepts;
  the text states the exact rule consequence for new players.

## TDD evidence

The first focused test import failed before `FactionPicker` existed. The green
suite covers selecting a side, color pairing, selected-only detail, disabled
board semantics/reason, and catalog/engine-aligned exception facts. Run:

```sh
npx vitest run src/__tests__/second_dawn_faction_picker.spec.tsx --maxWorkers=1 --minWorkers=1
npx eslint src/second-dawn-game/FactionPicker.tsx src/second-dawn-game/factionPresentation.ts src/__tests__/second_dawn_faction_picker.spec.tsx
```

## Acceptance criteria

- A player can identify the shared physical board and choose either side
  without seeing twelve full rule cards.
- The selected faction shows its starting resources, technology effects, ship
  distinction, major benefits, and constraints in one place.
- Setup owners can prohibit a board color with an explicit seat reason.
- The component has no command, persistence, catalog, or game-state effect.

## Render review

Reviewed the actual local solo setup after selecting Planta at 1366×768,
1440×900, and 1920×1080. The paired boards, selected state, colored resource
icons, prominent effect values, technology effect text, and constraints were
visible with no horizontal overflow or browser errors. Computed sizes were
14px for faction names, 13px for effect labels, 12px for rule support, and
11px for resource labels. The selected detail naturally extends below the
shortest viewport rather than shrinking its text; it remains in the ordinary
page scroll. Eridani's three technology cards were separately reviewed at
1366×768 and fit on one row without clipping.

Evidence: `tools/second-dawn-faction-picker-review.mjs`,
`coding_agents/second_dawn_revision_screenshots/faction-picker-review.json`,
and the `*-faction-picker.png` / `1366x768-faction-picker-eridani.png`
captures. The script exercises the real integrated setup by default. A
temporary fixture used only while the development backend was unavailable was
removed before completion.

## Risks and follow-up

The detail panel is intentionally wide for desktop setup. Its integration
review should capture the normal desktop sizes after it replaces the existing
native solo-faction select. Multiplayer setup should pass claimed color
reasons into `unavailableColors`; server-side faction validation remains the
authority.
