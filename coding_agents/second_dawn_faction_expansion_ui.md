# First expanded faction group: UI delivery

Outcome: choose and play Rho Indi, Magellan, Midas and Ragnarok using recognizable faction identity, independent piece colors, and visible authoritative ability choices.

Acceptance: expanded roster is the default for new games; Base only preserves paired-board restrictions and old saves. All territory, fleet, population, diplomacy and score ownership colors follow assigned pieces. Ability actions stay editable/explicit and cannot bypass legality. Ragnarok exposes independent Build/Move counters; Midas prices its optional continuation; Magellan presents the resource received and colony ship consumed. Desktop and mobile workflows remain usable.

Risks/rollback: old optional fields fall back to base behavior. No existing saved match is promoted to the expanded profile. Revert this UI slice together with profile-dependent setup exposure if rules are unavailable.

Tests first: `second_dawn_expanded_faction_ui.spec.tsx` produced 4 failures/1 pass before implementation (new roster, distinct emblems, color selection, assigned-color fallback); existing base-board behavior remains covered. Ability workflow and browser verification follow authoritative engine contract integration.

Decision log: emblems identify species; piece colors identify ownership. Reuse explicit ship silhouette families for this first group without reusing another species' emblem. Separate faction profile from rules variants: eight rounds, private reputation and existing base trade rates remain.

## Implemented and verified

- New solo and room setup default to the expanded profile. Base-only setup preserves paired faction boards; occupied seats cleared by a profile change show “Choose faction” and cannot ready until they select again. Expanded faction and piece-color reservations are independent.
- Four distinct SVG faction emblems and explicit ship-family mappings preserve species identity. Territory, fleet, population, diplomacy, score and player inspector ownership use the assigned piece color with legacy fallback.
- Magellan exposes legal colony-ship conversions in action/upkeep and scores historical discovery-part uses. Midas shows its exact optional activation price and opens the purchased workflow. Ragnarok displays independent Build and Move counters and keeps the other usable budget available after a commit. Rho Indi cannot build or edit an unsupported Dreadnought.
- Resource conversion and funded purchase previews use exact asymmetric quotes, including Rho 3 Money → 2 resources and Magellan’s optional 3 Materials → 2 resources.
- Deterministic preview positions cover all four factions, Midas’s paid research continuation and Ragnarok’s active combined action. Mixed-action fixtures use actual exploration/build commands and a legal movement route.

Validation: 22 focused roster, lobby, ability and expanded conversion tests passed; an earlier 32-test economy/research/lobby batch passed. TypeScript and scoped frontend lint passed. The browser harness `tools/second-dawn-expanded-faction-review.mjs` passed all 16 combinations of Chromium/WebKit, 1440×900/390×844, and picker/Midas/Magellan/Ragnarok workflows. Results and reviewed screenshots are in `second_dawn_faction_expansion_review/`. The picker fixture uses the actual launcher background/styles. Screens were reviewed for ownership identity, card legibility, controls, clipping and document overflow. The mobile Move workspace retains its existing scrollable ship selection; expanded counters remain legible. These are automated task walkthroughs and visual review, not a human playtest. Parent owns the full memory-bounded release suite, production build and deployment.

## Action-label cleanup

Per follow-up user direction, the desktop/mobile action menus no longer offer a standalone “Discard reputation” shortcut. Contextual reputation returns for diplomatic capacity and authoritative decisions remain intact. Resource exchange navigation, workspace, submit button and bankruptcy shortcut now say “Convert”; internal command and saved workspace IDs stay compatible. Updated existing tests first: six failures established the old labels/shortcut before implementation.

Cleanup verification: all 41 affected conversion, draft preservation, Empire, mobile choice-workspace and diplomacy tests passed with `NODE_OPTIONS=--no-experimental-webstorage` (required by the installed Node version so jsdom supplies browser storage). Scoped lint and `git diff --check` passed. Existing browser harness selectors were updated to the new Convert labels.
