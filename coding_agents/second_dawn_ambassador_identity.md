# Ambassador offer identity — September 19, 2026

Outcome: a player immediately recognizes which faction is proposing an ambassador exchange before choosing a response.

Acceptance: show the exact public faction name, established civilization emblem and established faction color prominently; keep the offered population resource, income/VP consequences, acceptance/decline draft and authoritative resolve command unchanged. Missing optional view data must not invent a faction. No Board or backend changes.

Implemented a named offer group at the top of the existing diplomacy decision, with a large FactionSymbol and bold faction heading. Uses shared FACTION_COLORS and works with alien/human civilization faces. The offer's population-cube description remains alongside the identity, ahead of response choices. Presentation-only scope; rollback is EconomyDecision imports/banner plus its economyDecision.css rules.

TDD: both initial identity tests failed (`coding_agents/logs/ambassador_identity_red.out`), then the identity/submission tests and existing map/draft diplomacy tests pass (8 tests). Coverage includes correct emblem/name/color, offered science cube, unchanged chosen materials acceptance command, preserved visible proposer during a decline draft, disabled commitment and existing map inspection preservation. Changed ESLint is clean; parent owns integrated final release gates.

Actual Chromium and WebKit at 1440×900 and 390×844: all four banner checks pass with no page errors, card overflow or document overflow. The first render review exposed inherited heading CSS reducing the faction name to 13px; specificity was corrected and a browser assertion now requires at least 20px. Final desktop/mobile screenshots show a readable colored emblem/name group and intact offer text. Evidence is in `coding_agents/second_dawn_ambassador_identity_review/`, produced by `tools/second-dawn-ambassador-identity-review.mjs`. Screenshots were inspected; this is agent visual review, not a human playtest.
