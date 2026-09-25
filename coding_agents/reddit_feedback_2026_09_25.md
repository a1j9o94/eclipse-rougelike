# Reddit playtest feedback: next Second Dawn slices

Status: planned; no gameplay or UI changes shipped by this document.
Date: September 25, 2026.
Source: player comments supplied by the product owner after the public post. One player stopped after round one because menus dominated the board and action buttons were hard to find; another repeatedly passed with unused colony ships. A reader asked why The Exiles and Enlightened of Lyra were absent. A companion-app author suggested exploration probabilities. These are distinct requests, not evidence that every proposed feature has been validated in play.

## Decision and delivery order

| Priority | Player outcome | Slice and acceptance | Evidence before release |
| --- | --- | --- | --- |
| 1 | A player sees colonization opportunities before passing and can act on them immediately. | Show available colony ships **and currently legal empty planets** beside Pass in desktop and mobile action surfaces, with a direct Colonize entry. The cue follows authoritative legal candidates, so ships alone never promise an impossible placement. Passing remains a one-click choice; do not force a modal or auto-spend a ship. Include a brief, dismissible reminder in the pass context only when a placement is legal. | Failing-first UI cases: legal planets and ships, ships but no legal planets, no ships, wrong turn/pending decision, mobile, and Pass submitted exactly once. Human repeat-pass playtest. |
| 2 | Players find the next action without hunting through menus, while the galaxy remains the main workspace. | Group the six ordinary actions consistently; place Colonize, Trade, Pass, and upkeep/continuation controls in a clearly separate, stable area. Keep the active action and its commit beside the selected board object. Improve action hierarchy and recognizable visuals without relying on hover or a full reskin. | Observe two newcomers and two experienced players doing a round-one task set before and after. Record action-search time, wrong-menu opens, board visibility, and whether they understand the result. Desktop/mobile keyboard and draft-preservation regressions. |
| 3 | Exploration information is useful and honest. | Keep current public sector-deck counts. Explore may explain ring composition and how draws/discards change it. If showing percentages, label them as **starting-deck reference odds**, unless the current public projection supports exact remaining distribution. Never derive live odds from hidden tile identities/order. | Privacy and variant-deck tests, draw/discard/reshuffle cases, and user comprehension check of what the percentage means. |
| 4 | Players can select the missing publisher Second Dawn species. | Implement **The Exiles** and **Enlightened of Lyra** as separate vertical releases, then Lyra's anti-missile variant. Pin a new faction-profile version so existing `expanded-v1` matches retain their roster. Transcribe exact board/setup fixtures before coding, using the archived publisher rules and the collection's explicit amendments. | Failing-first rules scenarios, reconnection/private-view tests, AI legality and bounded full matches, faction-specific UI/playtest, then lint, relevant tests and build for each release. |

## Scope behind the decisions

The current Pass button submits directly from `SecondDawnBoard.activate`; colonization count appears in the colonization planner or Empire screen, and an existing upkeep reminder comes after the player's pass decision. The next cue belongs at that decision point. Derive opportunity count from legal colonization candidates rather than raw empty planets or ship stock. Unused colony ships are sometimes intentional, so the interface must inform rather than block.

The desktop header currently exposes up to twelve action buttons, and the mobile picker repeats the verbs in a separate surface. The reported problem merits a targeted playtest and layout slice. Preserve existing object-based entry points, drafts, rules previews and accessible equivalents. Measure the experience before committing to a large graphic redesign; the existing art-direction studies may inform later visual work.

The Exiles need an Orbital that can be populated, fight through its own blueprint, lose population while the structure remains, be recolonized, and score appropriately. Today `Sector.orbital` is a boolean structure and normal ship blueprints cover four classes. This is a combat/ownership/scoring lifecycle, not a catalog-only addition. Lyra needs Shrine placement tied to Research, persistent Shrine/row bonuses, combat choices and scoring. Both require AI to value and legally use their abilities. Keep each species fully playable rather than exposing a partially implemented picker entry.

`expanded-v1` currently returns all registry entries. Before adding either faction, define an immutable roster for that saved profile and a new opt-in profile for the larger collection; update the shared catalog, multiplayer/Convex validation, launcher copy and picker together. Current game options and old saves must keep their selected roster and rules. Resolve how the collection's house-rule amendments interact with ordinary eight-round games explicitly; do not silently apply its global variant rules.

## Decision log

- Prioritize a contextual colony cue because it directly addresses observed lost income and is already consistent with UX-12's nonblocking pass guidance.
- Treat “menus dominate the board” as a workflow and visual-hierarchy issue to test in round-one play, not a request to copy physical-board graphics literally.
- Defer exact live exploration probabilities until public information supports a truthful calculation. Deck counts currently expose no hidden identities/order.
- Add both requested official expansion species, one at a time, with a versioned faction roster. The publisher lists Exiles in Outcasts and Lyra in Seekers; the repository already has source research and archived boards.

## Risks, rollback and follow-ups

- A colony reminder can become nagging or falsely suggest a legal action. Show it only for current authoritative legality, keep it dismissible and test Pass without extra submission.
- Moving actions can hide a valid route or discard a draft. Preserve keyboard/mobile reachability and receipt-aware drafts; revert the shell layout independently if playtests regress.
- Faction state must survive saves, recovery and multiplayer projection. Ship/structure and Shrine data should be added through explicit typed state, with backward-compatible defaults; release each faction independently and disable its profile if a regression appears.
- Record actual newcomer/expert observations, source transcriptions, failing-first tests and deployed commit in the Second Dawn UX ledger as slices complete. Do not mark these planned slices as shipped here.

Primary references: `coding_agents/second_dawn_ux_iteration_plan.md` (UX-12 and delivery ledger), `coding_agents/faction_research/README.md`, `coding_agents/faction_research/factions.md`, `src/second-dawn-game/SecondDawnBoard.tsx`, `src/second-dawn-game/ColonizationPlanner.tsx`, `shared/eclipse/catalog.ts`, and the publisher's [Outcasts](https://en.lautapelit.fi/product/45705/eclipse---2nd-dawn-outcasts-eng) and [Seekers](https://en.lautapelit.fi/product/45704/eclipse---2nd-dawn-seekers-eng) listings.
