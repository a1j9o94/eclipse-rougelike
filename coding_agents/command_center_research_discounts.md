# Command-center research discounts — 2026-09-19

Outcome: show the same research discount progression in the command center and public empire overview as in Research.

Acceptance: Military/Grid/Nano reuse ResearchDiscountTrack, show current and next discounts from actual placements, retain researched-tile inspection, and fit desktop/mobile. Existing income/upkeep tracks remain separate from technology discounts.

Implementation: EmpireOverview mounts the shared component per track. Scoped the old tile-container CSS to eo-tech-tiles so it does not override the shared strip layout. No duplicated discount rules, command or persistence changes.

Validation: new command-center regression failed before implementation. All 12 empire-overview/shared-discount tests now pass; full lint and production build pass, with existing Browserslist/bundle warnings. Rendered 1440×900 and 390×844 screenshots in screenshots/empire-discounts opened and reviewed: all seven steps fit, current and next labels visible, researched cards still usable.

Rollback: revert this isolated frontend commit. Minor Species remains separate ongoing work.
