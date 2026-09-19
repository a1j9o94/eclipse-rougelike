# Dice-roll sound — September 19, 2026

## Outcome
Combat dice feel tactile through brief, varied tabletop clacks synchronized with their visible bounces.

## Acceptance criteria
- Audible impacts follow the existing cosmetic throw, with softer settling and bounded volume for large volleys.
- Dice sounds and volume save automatically in browser settings; muted/zero-volume rolls remain silent.
- Skipping, leaving the view, muting, and hiding the tab stop active sound. Sound continues independently when motion is off or WebGL is unavailable. Old rolls never replay on audio unlock.
- Browser audio permission failures leave all game controls and authoritative results intact.
- No combat, random outcome, save, or backend changes.

## Tests (fail first)
- Sound starts on renderer impact, once per visible throw; stops on skip, unmount, settle, mute, and hidden tab.
- Sound settings persistence, bounded volume, accessible controls and keyboard focus.
- Web Audio failure and node cleanup; bounded simultaneous voices.
- Bounce timing matches visual landing milestones; slow frames do not replay a backlog of clacks.

## Risks and rollback
Browser autoplay restrictions and subjective timbre are the main risks. Unlock only from player interaction; failures fall back to silence. Sound is optional and may be disabled independently. Revert the frontend change to roll back; no data migration.

## Decisions
Use native Web Audio for small, varied noise/resonance impacts, with no downloaded asset or runtime dependency. Follow visible bounce timing when 3D is active; run the same sound timeline independently for instant results or reduced motion. The user explicitly requested independent sound/animation toggles. All controls, including Follow AI and the existing server-saved auto-pass preference, are available in Settings; toolbar shortcuts remain available. Follow AI now also remembers its browser preference.

## Validation / follow-ups
Implementation complete. Final focused suite: 118 tests across 20 files pass, including combat, auto-pass, choice preservation, audio lifecycle, and settings. Full lint and production build pass. Existing Vite bundle-size notices remain. Automated audio checks establish timing and signal behavior, not a human listening assessment.

### Review findings
Independent review found and fixed StrictMode cancellation of sound-only throws and the separate volley-skip control not stopping sound. Review also identified the mounted-but-hidden choice workspace; visibility now has its own gate rather than being conflated with animation preferences.

Desktop (1440×900) and mobile (390×844) settings screenshots were inspected in Chromium and WebKit. Labels, checkboxes, volume, and auto-pass fit and remain readable; the header exit remains available. The original native WebKit slider track was too dark, so it now uses a consistent contrasting track and brass thumb.

Audio verification instruments real Web Audio output in Chromium/WebKit without relaxing autoplay restrictions. Animated and sound-only rolls produce nonzero signals; muted/zero-volume rolls produce none; skip cancels future impacts. No human listening assessment has been performed. A player listening pass remains the evidence needed to judge naturalness of the synthesized clatter.

### Release evidence
- 16 actual-browser cases passed: Chromium and WebKit each cover animated sound, sound-only, mute, zero volume, skip, minimize, and settings at desktop/mobile sizes. No page errors. [Browser results](second_dawn_dice_sound_review/results.json).
- [Reproducible browser walkthrough](../tools/second-dawn-dice-sound-review.mjs); screenshot set in `second_dawn_dice_sound_review/`.
- Git release uses the existing main-only Vercel integration; no Convex deployment or schema change. Live deployment proof is recorded in ignored runtime logs after the main push.
