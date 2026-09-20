# Antimatter Splitter target overlap

Outcome: large target fleets have readable ship identity and selectable damage controls without neighboring cards overlapping.

Reproduction used the real SplitDamageCards component in an isolated browser harness, with16 mixed Draco cruisers/dreadnoughts and the production styles. Before the fix, cards measured194px wide while damage steppers extended14–30px beyond their edges. This failed geometry check preceded implementation.

Fix: splitter-specific responsive grid with210px minimum cards (bounded by available width); each card has a wrapping ship identity row and a separate full-width damage control row.44px buttons remain usable on touch screens. Combat allocation rules and confirmation are unchanged.

Browser after: zero overflowing cards/controls at desktop and390×844. Assigning one damage to each of four cards showed4/4 assigned and disabled every increase button. Reviewed screenshots: screenshots/splitter-many-ships-desktop.png and screenshots/splitter-many-ships-mobile.png. These are isolated real-component engineering checks, not full-match screenshots or human playtesting.

Ten existing combat allocation/flow tests pass. Full lint, TypeScript and production build pass with existing Browserslist and bundle-size warnings. Rollback is limited to presentation classes/styles.
