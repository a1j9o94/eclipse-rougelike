# Tutorial Update Plan — Outpost Redesign (tabs + compact actions)

## Goals

- Keep the tutorial accurate and helpful after the Outpost refactor.
- Teach the new frame tabs, compact action buttons, capacity row, and tech/shop affordances without extra reading.
- Preserve curated-shop beats and the same “learn → do → fight” rhythm.

## Code Audit (current tutorial touchpoints)

- Script: `src/tutorial/script.ts` (STEPS + `nextAfter`, `curatedShopFor`).
- State: `src/tutorial/state.ts` (`event(name)`, localStorage, step ids).
- Outpost anchors present now:
  - `enemy-intel-btn`, `blueprint-panel`, `capacity-info`, `expand-dock`,
  - `reroll-button`, `shop-grid` + `shop-item-<id>`,
  - `start-combat`, `research-grid`.
- Outpost anchors removed/changed:
  - `dock-roster` no longer exists (tabs control focus instead).
- GameShell still emits tutorial tech-list events.

## Required UI hooks to add (small code changes)

1) Frame tabs anchor: add `data-tutorial="frame-tabs"` to the tablist div in `src/pages/OutpostPage.tsx`.
2) Frame action anchor: add `data-tutorial="frame-action"` to the compact action button area (the Build/Upgrade button under tabs).
3) Optional: emit tutorial events on tab selection in `OutpostPage` (non‑blocking but enables progressive guidance):
   - `tutorialEvent('tab-interceptor')`, `('tab-cruiser')`, `('tab-dread')` when selecting those tabs (guard with try/catch and feature flag like other events).

## Step Sequence v2 (proposed)

Below is the full ordered list to replace `STEPS` in `script.ts` (names keep the same ids when possible to minimize churn). New/renamed items are marked.

1. `intro-combat` (same)
2. NEW `outpost-tabs` — anchor `frame-tabs`
   - Copy: “Use these tabs to focus each frame. Start on Interceptor; Cruiser/Dreadnought will preview until unlocked.”
   - Triggers: `tab-interceptor` (or `next` if we don’t wire tab events).
3. `outpost-blueprint` (same id) — anchor `blueprint-panel`
   - Copy tweak: “This blueprint applies to every ship of this class. Changes affect new builds and upgrades.”
4. HUD quartet (unchanged ids, minor copy nits):
   - `bar-resources`, `bar-capacity` (add “X/Y shows used vs total.”), `bar-sector`, `bar-lives`.
5. Shop — Composite beat (same ids) `shop-buy-composite-1`/`-2` with curated shop.
6. `combat-2` (same id)
7. Research Nano (same ids) `tech-nano`, `tech-open`, `tech-close`.
8. Sell Composite / Buy Improved (same ids) `sell-composite`, `buy-improved` + curated.
9. `combat-3` (same id)
10. Research Military (same id) `tech-military` — anchor `research-grid`
    - Copy tweak: “Military ≥ 2 unlocks Interceptor → Cruiser.”
11. Capacity row (rename and split):
    - `capacity-info` (same id) — anchor `capacity-info` (“Capacity shows used/total. You’ll need room to upgrade frames.”)
    - `dock-expand` (same id) — anchor `expand-dock` (“Tap + to expand. Cost shows next to the +.”)
12. Upgrade to Cruiser (rename/anchor tweak):
    - RENAME `upgrade-interceptor` → keep same id but anchor `frame-action`.
    - Copy: “Upgrade to Cruiser. Watch slots and ⚡ power.”
    - Trigger: `upgraded-interceptor` (unchanged event name).
13. Reroll beat `shop-reroll` (same id) — anchor `reroll-button` (copy unchanged).
14. Intel beats `intel-open`/`intel-close` (same ids) — anchor remains `enemy-intel-btn`/`intel-modal`.
15. `rules-hint` (same id) — anchor `help-rules`.
16. `wrap` (same id).

## Script diffs (targeted)

- Replace `outpost-ship` step with `outpost-tabs` (new id) and update copies as above.
- Change step `upgrade-interceptor` anchor from `upgrade-ship` (removed) to `frame-action`.
- Minor copy tweaks for `bar-capacity`, `tech-military`, `dock-expand` to reflect inline cost and +.
- Keep curated shop arrays as-is; no change to ids.

## Event mapping changes

- Optional but recommended: tab events to advance `outpost-tabs` cleanly.
  - In `OutpostPage`, after `setFrameTab('interceptor'|'cruiser'|'dread')`, call `try { tutorialEvent('tab-<name>') } catch {}`.
- Existing events used by script remain the same:
  - `opened-tech-list`, `viewed-tech-list`, `researched-nano`, `researched-military`,
    `expanded-dock`, `upgraded-interceptor`, `bought-composite`, `bought-improved`, `rerolled`, `started-combat`, `post-combat`, `opened-intel`, `viewed-intel`.

## Anchors summary (what tutorial will expect)

- `frame-tabs` — new (add to Outpost tablist)
- `frame-action` — new (add to Build/Upgrade compact button)
- `blueprint-panel`, `capacity-info`, `expand-dock`, `shop-grid`, `shop-item-<id>`, `reroll-button`, `start-combat`, `enemy-intel-btn`, `intel-modal`, `research-grid`, `help-tech`, `tech-close`, `help-rules` — unchanged.

## Text updates (exact copy)

- `outpost-tabs.copy` = “Use these tabs to focus each frame. Start on Interceptor; Cruiser/Dreadnought will preview until unlocked.”
- `bar-capacity.copy` = “Capacity: shows used/total (X/Y). Bigger frames use more.”
- `dock-expand.copy` = “Tap + to expand docks. The cost is shown next to the +.”
- `tech-military.copy` = “Raise Military to unlock Interceptor → Cruiser (≥ 2).”
- `upgrade-interceptor.copy` = “Upgrade to Cruiser. Watch ⬛ slots and ⚡ power.”

## Acceptance criteria

- Tutorial can be completed end‑to‑end with the new Outpost UI.
- All anchors resolve; no overlay points at missing elements.
- Step copies accurately reference tabs, compact action, inline capacity cost, and preview state.
- Curated shop still injects as before.

## Implementation checklist

1) Add anchors in OutpostPage:
   - `[ ]` `data-tutorial="frame-tabs"` on the tablist div.
   - `[ ]` `data-tutorial="frame-action"` on the frame action button.
   - `[ ]` (Optional) `tutorialEvent('tab-…')` on tab select.
2) Update `src/tutorial/script.ts`:
   - `[ ]` Replace `outpost-ship` step with new `outpost-tabs` step.
   - `[ ]` Update `upgrade-interceptor.anchor` to `frame-action` and copy.
   - `[ ]` Copy tweaks for `bar-capacity`, `tech-military`, `dock-expand`.
3) No changes needed to `tutorial/state.ts` except recognizing the new step id; keep `nextAfter` logic unchanged.
4) Tests (add/adjust):
   - `[ ]` `tutorial_overlay.spec` ensures `frame-tabs` and `frame-action` anchors exist.
   - `[ ]` `tutorial_events.spec` (optional) advancing on `tab-interceptor` event.
   - `[ ]` Smoke: curated shop still seeds IDs when step is `shop-buy-composite-1`.

## Rollback

- If anchors cause regressions, hide new steps by keeping the old `outpost-ship` id and mapping it to `blueprint-panel` for a minimal patch.

