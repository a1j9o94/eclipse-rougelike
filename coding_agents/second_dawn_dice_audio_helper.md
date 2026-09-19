# Dice impact audio helper — 2026-09-19

## Outcome and acceptance

Visible dice bounces can produce brief, varied tabletop clacks without affecting authoritative combat, blocking a turn, or queuing stale sound behind autoplay restrictions. Playback must remain bounded for large rolls and stop immediately on caller request.

## Implementation

- `src/second-dawn-game/dice3d/audio.ts` exports `prepareDiceAudio`, `playDiceImpact`, `stopAllDiceAudio`, and typed `DiceSoundHandle`.
- Preparation belongs in a trusted user gesture. A blocked/suspended or unsupported context stays silent, resume rejection is caught, and old impacts are never queued.
- Six cached 120ms noise-driven resonant clicks provide body and edge transients. Cosmetic randomness and pitch variation are independent of all game RNG/state.
- At most twelve voices remain connected. Dense impacts are attenuated before a shared dynamics compressor. Input loudness/pan are bounded; invalid loudness never reaches AudioParams.
- Explicit stop, natural completion, and playback failure disconnect per-impact nodes. Repeated stop is safe. Audio failure cannot interrupt combat.

## Validation

Fail-first command: `npx vitest run src/__tests__/second_dawn_dice_audio.spec.ts --maxWorkers=1` failed because the new helper did not exist. After implementation, five tests pass: unavailable/blocked playback, rejected resume and no delayed replay, finite decaying bounded varied buffers, one shared context and cleanup after start failure, bounded voices and idempotent cleanup. Changed-file ESLint passes.

## Boundaries and follow-up

Parent integrates gesture unlock, visible-bounce timing, mute/volume preferences and skip/unmount/visibility cancellation. Browser autoplay/lifecycle acceptance and final whole-change lint/build remain the parent's release gate. Unit tests verify waveform properties and lifecycle; they do not constitute human listening evidence. No dependencies, game-rule changes or backend changes.

Rollback is removal of the helper and its presentation-only call sites.

## Visibility review and fix

Independent review identified sound-only StrictMode cancellation and explicit volley-skip audio continuation; the parent corrected both with targeted regressions. A final review found that hidden `ChoiceWorkspace` children intentionally remain mounted, so animation gating no longer sufficed to silence them once sound became independent of animation preferences.

Added `DicePresentationVisibilityContext` at the choice workspace, consumed by `DiceRoll3D` and its sound hook. Minimizing an already visible roll immediately stops audio and prevents replay on return. A newly arriving decision that initially renders hidden remains eligible for its first visible presentation, preserving the board's effect-driven choice opening. Visibility and motion preferences remain separate.

Two visibility regressions failed before implementation (minimize did not stop sound; initially hidden choice scheduled audio). Three focused visibility tests now pass, along with ten sound playback/integration and twenty-two existing dice/choice workspace regressions. Changed-file ESLint passes. Browser review belongs to the parent's final release gate.
