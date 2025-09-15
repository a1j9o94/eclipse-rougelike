# Tutorial Onboarding — Design (v0)

## Outcome
- First-time players complete a short, guided run (3–5 sectors) that teaches: combat basics, outpost flow, blueprints/slots/power, buying parts, dock capacity, tech tracks, Enemy Intel, and the concept of ship frame upgrades. The tutorial is skippable and remembers completion.

## Player Flow (Scripted)
1) Opening combat: start with a single Cruiser mounting a “Spike Launcher” (hits only on 6) plus Source + Drive to be deployable. Minimal copy: “You command a mercenary cruiser. Watch shots; only 6 hits.”
2) Outpost basics: highlight the selected ship card (stats, ❤️/🛡️/🎯/⚡/⬛), then the Class Blueprint panel (slots + power), then the Shop (seeded items). Prompt to buy any one part and show it appear in the blueprint.
3) Combat #2: prompt “Let’s test your new part.”
4) Docks: on return, introduce Capacity (tonnage used vs cap). Prompt to Expand Capacity once (or explain if unaffordable).
5) Tech: introduce 🔬 tracks; invest once (prefer Military). Explain unlocks preview and reroll-cost increase.
6) Frame upgrades: explain upgrade path (Cruiser → Dread requires Military 3). If locked, show lock reason; if available, allow upgrade.
7) Enemy Intel: open the “📋 Enemy Intel” modal; teach reading ship minis and boss sectors.
8) Wrap: remove guidance; suggest continuing a normal run.

## Minimal-Change Implementation
- Overlay-only UI: add a generic `CoachmarkOverlay` that can show a panel with arrow/spotlight anchored via `data-tutorial="key"` selectors. No engine changes required.
- Lightweight tutorial state: `src/tutorial/state.ts` stores `{ enabled, step }` in localStorage, with helpers: `isEnabled()`, `getStep()`, `advance()`, `complete()`, `reset()`.
- Script + conditions: `src/tutorial/script.ts` enumerates steps with display text, anchor keys, and completion predicates (e.g., “bought-part”, “expanded-dock”, “researched-track”).
- Event taps (one-liners):
  - In `useRunManagement.newRun`: if tutorial enabled, apply starting-seed overrides and call `advance('started')`.
  - In `useOutpostHandlers`: after buy/upgrade/dock/research, call `tutorial.event('<action>')`.
  - In `useRunLifecycle` (on return to outpost): call `tutorial.event('post-combat')` and optionally seed the next shop for the current step.
- Anchors (non-invasive): add `data-tutorial` attributes only where needed:
  - Outpost: `data-tutorial="ship-card"`, `blueprint-panel`, `shop-grid`, `expand-dock`, `upgrade-ship`, `research-grid`, `start-combat`, `enemy-intel-btn`.
  - Combat: `data-tutorial="log"` (optional).

## Shop Seeding (Per Step)
- Step 2 (Buy a part): `[fusion_source, ion_thruster, positron, plasma]` — cheap options to explain power/aim/weapon basics.
- Step 4 (After docks): `[micro_fusion, gauss, composite, plasma]` — defense & power management.
- Step 5 (After tech): if Military=2 show tier-2 samplers `[tachyon_drive, antimatter, improved]`; otherwise fallback to tier‑1 variants.
- Step 6 (Upgrades): if Military=3 and Cruiser focused, bias economy toward upgrade affordability by including a discount-friendly mix.

## Copy Notes (concise, action-first)
- Explain icons once: ⚡ Power • 🚀 Init • 🎯 Aim • 🛡️ Shields • ❤️ Hull • ⬛ Slot • 🎲 Hit/Rift die.
- Spike Launcher note: “Only a 6 hits; computers don’t help.”
- Capacity: “Docks hold tonnage. Expand to field more hulls.”
- Tech: “Tier unlocks raise what you can buy and which upgrades are available.”
- Upgrades: “Military 3 → Dreadnought; more slots/tonnage but costs more.”
- Enemy Intel: “Planned enemies; bosses at 5 and 10.”

## Acceptance Criteria
- Tutorial auto-enables for true first-run OR can be started from StartPage (button). Skippable at any time; completion stored to disable future auto-start.
- Overlays appear in the order above and advance only when the associated action is detected (buy part, expand docks, research once, etc.).
- Shop shows curated items for steps 2/4/5; rerolls still work but curated set is applied on first open/return each step.
- No blocking of core inputs beyond dimming the background and ignoring clicks outside the highlighted area for the current step.
- Multiplayer is unaffected (tutorial disabled in MP).
- Lint/build/tests remain green.

## Tests (fail-first targets)
1) State: advancing steps on `tutorial.event('bought-part')` and `post-combat` updates `getStep()`.
2) Seeding: `useRunLifecycle` seeds curated items when tutorial step expects it.
3) Outpost tap: `useOutpostHandlers.buyAndInstall` calls tutorial event.
4) Start seed: `useRunManagement.newRun` applies Cruiser + Spike blueprint when tutorial enabled.
5) UI smoke: rendering Outpost shows overlay anchored to `data-tutorial="shop-grid"` on the right step.

## Risks & Rollback
- Anchor drift: UI refactors can move target nodes. Mitigation: data attributes and test coverage for anchor presence.
- Player stuck: a gated action is unaffordable. Mitigation: allow “Skip this step” and provide small stipend on step entry when needed.
- Rollback: feature flag the overlays; disable tutorial entirely without touching engine.

## Follow-ups
- Add a “Tutorial” toggle and “Reset Tutorial” to Settings.
- Enrich Enemy Intel step with small tooltips over ship minis explaining stats.

