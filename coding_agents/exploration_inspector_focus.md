# Exploration frontier focus

Outcome: choosing an unexplored location clears the previous sector inspection so the frontier confirmation is immediately visible.

User clarified this means closing the old inspector content, not relocating a drawn tile. The exploration action workspace stays open with its cost/confirmation. Selecting a frontier clears the selected sector and AI narration focus, and shows an Explore new sector heading. Draws and committed sectors are unchanged.

TDD: desktop regression reproduced the stale planets/fleet content; mobile case covers the same selection with its collapsed sheet. Both now pass, with six existing exploration map/visual cases (eight total). Full lint, TypeScript and production build passed. Existing Browserslist/bundle warnings remain.

Reviewed390×844 actual browser selection of an owned sector followed by an unexplored frontier. Screenshot: screenshots/explore-frontier-mobile.png. No human playtest claim. Rollback is presentation-only.
