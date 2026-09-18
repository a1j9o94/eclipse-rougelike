# Mobile pending-decision workflow review

## Outcome and acceptance

Players can finish uncommon pending decisions on a 390px-wide phone layout, with reachable confirmation controls and an accepted engine result. This review uses the actual board and preview engine; it does not mutate cloud games.

Acceptance: select a real choice, scroll and activate its visible confirmation, observe exactly one public revision increment per command, and capture the resulting screen. No automatic command submission or hidden success-message assertion is used.

## Evidence

- Runner: `tools/second-dawn-mobile-pending-workflows.mjs`.
- Structured results and screenshots: `coding_agents/second_dawn_mobile_pending_workflows/`.
- Runtime log: `coding_agents/logs/second_dawn_mobile_pending_workflows.out`.
- Environment: local Vite preview, Chromium mobile/touch emulation at **390×844**.
- Result: **9 workflows, 10 accepted commands, zero browser page errors**.

| Workflow | Choice completed | Public revision |
| --- | --- | --- |
| Control | Place influence disc | 2 → 3 |
| Bankruptcy | Abandon eligible sector | 252 → 253 |
| Portal placement | Place portal in eligible sector | 746 → 747 |
| Reputation | Keep 2 VP tile | 399 → 400 |
| Resource reward | Allocate four rewards to money | 720 → 721 |
| Population return | Return a cube to money | 365 → 366 |
| Discovery and ancient part | Use Conformal Drive, then store it | 3 → 4 → 5 |
| Combat retreat | Select a legal retreat sector | 396 → 397 |
| Diplomacy | Accept ambassador exchange | 152 → 153 |

Every activated confirmation was **44px high**, fully within the viewport after scrolling, and clickable. The script reads only the production board's authorized public view for revision and pending-decision verification; it does not inspect private engine state.

The control choice correctly leads to discovery. Population return and retreat advance to another queued decision; the review completes one return and one retreat rather than claiming the entire queue or combat is finished. Diplomacy advances to the remaining diplomacy window.

## Rendered review

Inspected the actual bankruptcy, population-return, and retreat screenshots. The bankruptcy result retains readable status and navigation around the dense galaxy. The population return screen scrolls its resource choices while keeping confirmation reachable. Combat cards and the retreat confirmation remain visible; lower explanatory content is scrollable. No blocking clipping or inaccessible confirmation was found, and no application change was needed.

This is automated browser evidence plus an agent review of rendered images, not physical-device or independent human playtest evidence. It covers representative paths, not every branch: bankruptcy trading, ancient-part installation, and the full population-return queue remain outside this bounded review.

## Validation and rollback

The workflow runner exits successfully, and `npx eslint tools/second-dawn-mobile-pending-workflows.mjs` passes. This change adds only a review script and evidence; removing those files reverses it without changing gameplay or persistence. The supervisor runs the final application gates and deployment separately.
