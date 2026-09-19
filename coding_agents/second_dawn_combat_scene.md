# Combat firing and impacts

## Player outcome

Players can see the fleet firing, the ships taking damage, and which ships were destroyed. A human still chooses Roll dice or Retreat; presentation never makes that decision. The scene makes the consequence of an accepted volley visible using the game's existing ship art and authoritative result data.

## Implemented

- A compact firing-and-impact scene precedes the detailed result cards in `CombatPlayback`, automatically covering active battles and the existing aftermath panel.
- Recorded source classes use faction ship silhouettes. Recorded impacts create weapon-colored traces; misses diverge from the target. Target silhouettes retain faction identity, HP before/after, and explicit Damaged/Destroyed/No damage labels.
- Destroyed ships retain an obvious wreck cross and subdued silhouette after they disappear from the live fleet.
- Opponent impact motion waits for the dice presentation to settle. Result text remains inspectable throughout. Own allocated rolls are not rolled again.
- Fast playback and reduced-motion preferences preserve the static scene and results without recoil, projectiles, or flashes.
- Human firing controls explicitly say to roll when ready or declare retreat. No automatic human roll, extra confirmation, or rules change was added.
- Legacy events without source or weapon provenance remain generic; they do not invent ship classes, weapon colors, or hits.

## Validation and review

Five new assertions failed before implementation: four scene/manual-turn behaviors and dice-to-impact timing. Existing casualty, battle overview, direct combat, volley allocation, and dice integration regressions were included in a bounded batch. One old broad `getByText('Destroyed')` assertion was scoped to the casualty group because the new scene intentionally also labels destruction.

Browser tool: `tools/second-dawn-combat-scene-review.mjs`.
Evidence: `coding_agents/second_dawn_combat_scene_review/`.
Chromium and WebKit at 1440×900 and 390×844:
- Roll visible without scrolling; exactly one accepted command.
- Retreat routes require deliberate selection; exactly one accepted command.
- A newly rolled/resolved engine volley supplies its actual Interceptor source and no-damage target result.
- Recorded destroyed Interceptor remains visible in the aftermath scene.
- No horizontal overflow or browser page errors.

Actual rendered desktop/mobile screenshots were reviewed. The first capture included rolling 3D dice over the scene; final static screenshots explicitly disable 3D dice and skip impact motion to make layout review reproducible. Desktop composition was centered after review to avoid excessive empty space; target faction names were brought into the scene so mobile players need not scroll to the detailed card to identify the casualty. The primary Roll/Retreat controls remain above the scene on mobile.

React review: no additional dependency, network request, animation loop, or authority-changing effect. CSS handles the short visual motion; one local completion key sequences it after the existing dice callback. Existing accessible result cards and controls remain available.

## Limits and next playtest

This is a brief rendered volley, not a full animated tactical battlefield. Historical records without provenance cannot show a specific firing class. Both the scene and detailed casualty cards are retained, so the aftermath's existing scroll area can contain details below the fold. Human review should confirm a newcomer can name who fired, who was hit, and what was destroyed without help, and that an experienced player can still roll, allocate, retreat, or skip motion quickly. Browser checks establish behavior and layout, not subjective tactility or player preference.

Final bounded result: **33 tests across seven files passed**, and changed TSX/test files passed ESLint. A separate Chromium smoke with real 3D dice enabled observed `is-awaiting-dice` initially, then confirmed the scene continued after settlement while remaining visible. The owned browser session was closed after verification. Full integration lint/build is recorded by the supervisor.
