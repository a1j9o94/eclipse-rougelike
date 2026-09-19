# Empire identity, 3D dice and readable connections — September 18, 2026

## Player outcome
Inspect an empire as a civilization board of resources, planets, fleets and abilities. Recognize factions by their ship silhouettes. Combat rolls briefly tumble over the entire game screen. Normal galaxy edges show actual connections rather than unmatched printed openings.

## Implementation decisions
- Shared public empire model drives own desktop player board, mobile Empire, and opponents. Empty planets separate fixed and flexible resources; current cubes/colony ships remain distinct from technology eligibility. Opponent reputation and private discoveries never enter the overview.
- Faction effect badges explain exceptional trade rates/action capacities and Ancient movement where applicable. Values derive from reviewed faction catalog; no rules/AI/commands changed.
- Six original SVG ship families, four classes each, paired Terrans share catalog-color family. Map, fleet inspector, shipyard, blueprints, discoveries and combat reuse them.
- Optional Three.js renderer is lazy loaded (~133KB gzip renderer bundle). True beveled 3D dice, pips, lighting/shadows; deterministic cosmetic motion settles to authoritative faces. Transparent fullscreen nonblocking overlay, auto clears in about 1.6s, skip, static fallback, reduced motion, scope by match, dispose GPU resources. Up to 24 dice animate; all result controls remain present. No additional random game outcomes.
- Settings open within game; browser-saved dice toggle and existing animation preference apply immediately. No Save/acknowledgement step. Failed storage preserves in-session preference.
- Normal map openings require adjacent paired wormholes or viewer-owned Wormhole Generator. Generator routes use distinct dashed/cyan treatment. Exploration placement explicitly shows all printed openings. Warp portals remain separate symbols; topology/legality are untouched.

## Review and verification
See [overview](second_dawn_empire_overview.md), [dice renderer](second_dawn_3d_dice.md), [dice integration](second_dawn_dice_integration.md) and [ship art](second_dawn_faction_ship_designs.md).
- Added TDD coverage for overview projection/privacy, dice math/lifecycle/integration, persistent settings, faction effects, connection display, and draft-preserving location inspection.
- First full bounded suite: 657 passed; 4 failures were prior labels for the replaced mobile Empire menu and old map legend. Tests updated to navigate the replacement controls, preserving their behavior assertions.
- Actual image review revealed and corrected desktop unused sidebar width, mobile Materials text clipping and a pre-existing vertical roster flex issue that consumed the entire phone viewport.
- Desktop1366/1440/1920 and phone390/360 browser checks assert actual paired-marker counts, raw placement markers, saved setting, no page errors or horizontal overflow. Chromium/WebKit actual combat overlay reviewed separately.
- No new human playtest evidence claimed; captured browser review is engineering evidence.

## Risks and rollback
Presentation only; existing saves, hidden information and authoritative rules are unchanged. Graphics failure instantly leaves normal result controls. Each feature can be reverted independently. Full repository lint has inherited88 errors / 12 warnings; changed code must remain clean.

## Follow-ups
Physical-phone feel and user preference feedback after deployment. Final gate/deployment evidence recorded under coding_agents/logs/empire_* and release summary.

Final gate: all 661 tests across 134 Second Dawn files passed with one worker (93.53s); production build passed;43 changed code files passed ESLint. Remaining full-repository 88 errors / 12 warnings are inherited. Five-view map/settings checks and overview walkthroughs pass; actual Chromium desktop/mobile and WebKit mobile full-screen combat roll checks pass. No outstanding engineering acceptance failures.
