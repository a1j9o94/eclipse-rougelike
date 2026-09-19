# Sector decks and neutral fleet recognition

Outcome: players can count the remaining exploration tiles by ring and recognize which neutral ships they are facing without interpreting generic labels.

Acceptance: a persistent Sector decks control shows I/II/III counts; opening it separates draw and discard piles, shows exhausted rings, and does not expose hidden tile identities or order. Older views fall back to explicitly labeled available totals. Counts update with authoritative views. Neutral fleet inspection and battle show class names, silhouettes, and authoritative stats.

Rules source: https://rules.dized.com/game/dS7ANw3JR-O-HIg-7k5qVA/Vbq3mokqSL2XEHaO0U0YfQ/discarding-explored-sectors — corresponding discards are shuffled when a sector stack empties. Existing supplyCounts combines both, so add optional count-only detail without changing its legality semantics.

Fail-first tests: public pile counts distinguish draws/discards and hide identities; changes after explore; UI counters/details/empty piles/old-view fallback; neutral fleet labels/stats. Relevant tests only, then full lint/build, desktop/mobile browser review.

Risks/rollback: additive optional view field, no save migration or rule changes; frontend remains compatible with old server views. Revert UI/view additions if necessary. Atlas redesign remains on its separate branch.

Decision log: root owns sector counters/protocol; visual agent owns neutral fleet recognition. Follow-ups: record actual validation and deployment below.

## Validation and result

Implemented an optional count-only `sectorDeckCounts` projection and a Sector decks toolbar control with ring stack icons. Six new deck tests cover private-data filtering, distinct piles, post-draw updates, exhausted/reshuffle state, older-view fallback, and live rerender. Combined deck/protocol/new neutral tests: 25 passed. Neutral-specific existing regressions also passed (15 tests including six overlapping new neutral cases), documented in second_dawn_neutral_identification.md.

Full lint and build passed, with existing Browserslist-age/chunk-size warnings only. React review: derived counts without effects, optional view compatibility, portal using existing focus-trapping GameDialog, stable keys, typed boundaries, no new network calls. Desktop 1440×900 and mobile 390×844 captures were opened and reviewed. Adjusted inherited dialog typography/layout and corrected the mobile toolbar rule that initially hid the deck button. Separate pile details are now readable; closing the panel preserves the game. Browser errors empty; no horizontal document overflow. Evidence screenshots/sector-decks and screenshots/neutral-identification. These are automated/agent checks, not a user playtest.

Limit: active matches currently select standard neutral profiles only. Advanced catalog variants are not enabled by this presentation change. The existing ancient-combat demonstration recording lacks old weapon provenance; no synthetic weapon metadata was invented for it. Current live combat uses the authoritative engine.

## Follow-up: full upkeep track and highlighted openings

User outcome: forecast successive action costs from the entire official upkeep ladder, and see every printed wormhole on a highlighted sector. Acceptance: generic money/science/materials income tracks in the command center (user correction; no global upkeep strip), no change to actual upkeep; hover, keyboard focus and selection reveal rotated printed openings only on highlighted tiles while actual connections keep their distinct styling. Fail-first tests cover selected/hover/focus reveal and classification of usable vs unconnected openings. No tile rotation or navigation legality changes. Agent owns upkeep component, root owns galaxy rendering. Verify responsive screenshots and relevant tests before release.

Highlighted openings: three new behavioral tests failed first, then 20 tests across visible-connections, galaxy rendering, and exploration previews passed. Selected, hovered, or keyboard-focused sectors reveal all rotated printed openings; connected edges remain gold and unconnected printed openings use a pale dashed outline. Desktop hover and mobile selection screenshots were opened and reviewed in screenshots/highlighted-openings. No browser errors. User correction moved full resource tracks into the command center; upkeep belongs there too, never in the global toolbar.

## Follow-up: research browsing during discovery

Outcome: inspect available technologies while a discovery choice is pending, then return to the exact choice. Acceptance: desktop Research navigates read-only while pending, a Browse technologies shortcut works directly from the discovery on desktop/mobile, and research submission stays blocked. Fail-first tests exercise each navigation path, preservation of Keep-for-VP selection, and no purchase despite sufficient science. No saved decision is resolved by navigation.

Discovery research: three initial navigation tests failed first, then a mobile card-selection check caught the stale Explore action footer. Corrected research browsing to stay out of action mode and preserve existing drafts. Choice-workspace suite 18 tests passed; combined with deck and visible-connection tests, 31 passed. Local mobile browser opened the market from discovery and returned; screenshots/discovery-research captures the persistent named return and the restored discovery panel. Tests explicitly verify Keep-for-VP draft retention and no purchase while pending. No browser errors.
