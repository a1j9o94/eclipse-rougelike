# Blueprint feedback clarity

## Outcome and acceptance

A player can read the edited ship's capabilities beside its name, see current reactor accounting there, and recognize outside-grid modules as attached components that consume no hardpoint. Desktop and phone layouts retain editable slots and final confirmation.

## Implementation

- Shared `OutsideGridModule` now renders a rectangular module in both the editor canvas and public blueprint loadout. Muon Source displays its energy/initiative icons and the explicit label “Outside grid · No slot used.” Installed Ancient modules remain permanent; available modules retain their draft checkbox.
- The editor uses the existing `ShipCapabilities` icon component next to its title. Weapon dice are grouped by type/color/damage. Hull, initiative, computer, shields and movement update from the draft; energy is omitted from this summary.
- The reactor stays adjacent to the title instead of being pushed to the far edge of the desktop header. On phones it wraps directly below the title. No rule or submission changes.

## Verification

Two regressions failed before implementation: the Muon module was missing from the canvas, and the live capability summary was missing from the title. The editor/part-picker/fleet-inspector/ancient-installation batch now passes all **30 tests**. Changed-file ESLint and `tsc -b` pass.

Actual component renders reviewed at **1440×900** and **390×844** using the agent-browser skill. Reactor and summary are legible and colocated, mobile slots remain two columns, and the module is visually distinct from numbered slots. Images saved at `/tmp/blueprint-feedback-desktop.png`, `/tmp/blueprint-feedback-mobile.png`, and `/tmp/blueprint-feedback-mobile-module.png`. The isolated browser fixture lives in ignored `coding_agents/logs/blueprint-feedback/`; it adds no product route. Full-app preview initially showed a transient Configuration Error during concurrent edits, so these are component-level visual checks rather than a claim of full-game browser verification.

React review: derived values only, no new effects or network requests, typed component options with existing callers unchanged, keyboard-operable checkboxes, accessible slot and module names. Human playtest evidence remains pending.
