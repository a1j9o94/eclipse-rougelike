# Upkeep planning and research access

Outcome: command-center economy planning states the money surplus/shortfall after upkeep, both now and after one more action/reaction. Players can inspect available technologies during upkeep and return to their unfinished review.

Acceptance: display money plus income minus authoritative upkeep; distinguish surplus, exact coverage and shortfall without relying on color. No next-action forecast when influence is exhausted. Read-only Research browsing must preserve the saved upkeep choice and cannot buy or submit upkeep.

User confirmed the original upkeep curve was correct. No rule or influence counting changes were made. Forecast uses current money/income before any action-specific spending or earnings; this assumption is stated beside the values.

TDD: four economy tests first failed because the balance region was absent. All ten economy tests and three upkeep Research regressions now pass (13 total). The earlier Research integration batch had31 passing tests including saved-choice and existing Research workflows. Full ESLint, TypeScript and production build pass; existing Browserslist and large-chunk notices remain.

Browser: reviewed1440×900 balance cards and390×844 Research browsing. Actual mobile workflow opened Research during upkeep, showed available technologies/discounts, then Back to upkeep restored the review without advancing the turn. Images: screenshots/upkeep-balance-desktop.png, screenshots/upkeep-research-mobile.png. These are engineering checks, not human playtesting.

Rollback: revert the presentation changes/tests; no persisted data migration.
