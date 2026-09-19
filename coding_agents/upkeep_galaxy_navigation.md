# Free galaxy browsing during upkeep

Outcome: Research and other workspaces offer View galaxy in the board controls. During upkeep, it closes the action sheet and exposes the whole board without submitting the saved choice. Sector selection shows sector facts rather than reopening the upkeep review. Back to upkeep returns to the unfinished review from Research, galaxy browsing or colonization. Mobile Galaxy navigation uses the same behavior.

TDD: two desktop/mobile navigation tests failed for the missing route before implementation. Five upkeep Research tests,18 saved-choice workspace tests and8 colonization-entry tests pass (31 total). Full lint, TypeScript and build pass with existing Browserslist/bundle warnings.

Actual390×844 browser walkthrough: open upkeep Research, View galaxy, inspect map, retain Back to upkeep. Full-board screenshot reviewed at screenshots/upkeep-full-galaxy-mobile.png. No rules, resource, or persistence changes; no commands submitted by navigation. Engineering validation only, no human playtest claim.
