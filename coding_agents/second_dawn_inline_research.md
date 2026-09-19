# Research confirmation on the selected card — September 19, 2026

Outcome: selecting a market technology reveals its purchase controls on that same card, with no jump to a distant confirmation panel. The player sees effect, exact science price, selected rare track and required conversion before deliberately confirming.

Acceptance: separate selection and commit buttons (never nested); no scroll-to-top on selection; controls remain local on phone and desktop; currency conversion, upkeep risk and track choices remain accessible; draft/receipt and owned technology inspection behavior preserved. No automatic spending. Tests fail first on card containment and unwanted scrolling, then retain funding/cross-navigation/late receipt tests. Browser review covers actual selected-card workflows and clipping. Parent owns Board integration.

Risks: an expanded card can become excessively tall or cramped at desktop column widths. Keep the primary commitment close to the chosen tile and secondary accounting below it. Authoritative command preview and legality remain unchanged. Revert presentation alone if needed; no state migration.

## Implementation and decisions

- Each market technology is an article containing the tile-selection button and a sibling purchase region. The region starts with required conversion amounts, selected rare track, any upkeep shortfall, and the exact-price Research button. Selection and commitment remain separate; no nested buttons or automatic spending.
- Tile statistics remain immediately visible. The selected exact price appears once, on its visual science-price confirmation. Description, advanced population eligibility, alternative funding and detailed action accounting remain on the same card. Owned/depleted technology inspection stays above the market, and duplicate owned market copies never render a second panel.
- Selection focuses the purchase region without scrolling. At phone widths below 560px, tracks use full-width cards; actual browser review exposed cramped two-column phone controls before this correction.
- Existing public props and command/funding/receipt behavior are unchanged. The integration fixture now returns to the next seat once Research exhausts its activation, as required by the parallel engine change.

## Verification

TDD: initial same-card containment and no-scroll tests failed against the old remote panel (`coding_agents/logs/inline_research_red.out`). Final research/funding batch: 13 tests pass, covering exact price/conversion disclosure, local rare-track choice, preserved draft inspection, older receipts versus newer drafts, owned duplicate copies, depleted stock, turn ownership and insufficient resources. See `coding_agents/logs/inline_research_final_tests.out`. Changed TypeScript and review script are ESLint-clean; `git diff --check` passes. App TypeScript passed earlier; parent owns final integrated build and complete bounded suite. There is no separate CSS linter configured.

Actual local Chromium and WebKit workflows at 1440×900, 390×844 and 360×800 all pass. A lower market Orbital tile stays at exactly the same vertical position on selection (0px shift in every case); the confirmation starts 67.5px after the tile, with visible conversion amounts in between. Each workflow opens funding choices and completes the authoritative isolated purchase and next-seat handoff. No page errors or horizontal document overflow. Both engines also pass a 390px view with computed card text doubled: button, cost, details and description wrap without card overflow.

Evidence: `tools/second-dawn-inline-research-review.mjs`, `coding_agents/second_dawn_inline_research_review/results.json`, and 14 screenshots in that directory. Reviewed actual desktop selected card, WebKit 360px selected card, WebKit funding panel and doubled-text image: clear local hierarchy, accessible price, no clipped controls. Expanded alternative funding still scrolls within the same card; its initial required-resource warning stays above the purchase button. These are agent browser checks, not independent newcomer or expert human playtests.

Integrated-suite follow-up: the existing advanced-population test retained its former market-panel DOM node after the selected technology became owned. Reproduced failure independently, then changed the test to query the current owned-inspection panel and assert its updated eligible count (2 → 1) and Already unlocked message; the former market panel is explicitly detached. No production change required. Expanded advanced/research/funding batch passes 21 tests; changed files remain ESLint-clean. Logs: `inline_research_advanced_red.out`, `inline_research_advanced_green.out`, `inline_research_advanced_lint.out`.
