# Combat launch, hit, and explosion sounds

## Outcome

A visible accepted volley has a short weapon-launch cue, a hit has an impact cue, and a destroyed ship has a brief explosion. These use the existing **Game effects** switch and volume, independently of dice sound, 3D dice, animations, and music. No rules, rolls, or timing of authoritative commands change.

## Implementation

- Original procedural cannon fire, missile whoosh, impact, and explosion buffers run through the shared prepared Web Audio bus, compressor, effects volume, and six-voice cap. No new AudioContext, downloaded asset, external license, autoplay request, or engine randomness is introduced.
- One firing cue per present weapon kind, and one impact/explosion cue per presented volley group, bound dense fleets' volume. Unknown legacy weapon provenance is not guessed. Misses launch their known weapons but do not create impact sounds.
- The scene starts launch sounds when its dice have settled; impact or destruction follows 350ms later, matching its CSS flash timing. With animations disabled, audio remains available through its independent preference.
- `useGameSoundFeedback.combatLive(revision)` rejects initial saved history, stale revisions, disconnected/reconnecting views, history/recap browsing, and hidden documents. The scene additionally consumes each scoped volley once and cancels pending impacts/running voices on hide, skip, mute, or unmount. Enabling effects later does not replay an old volley.
- The final ship can end combat and remove the aftermath UI immediately. A small board fallback presents that fresh final volley's audio when no battle or aftermath remains, using the same freshness guard and consumed key. It does not reopen old results.

## Tests and browser evidence

The missing hook first failed import; seven behavioral tests then cover missile/explosion sequencing, cannon/nonfatal impact, misses, missing legacy provenance, muted/hidden/non-live no-replay, and cancellation. A feedback test covers mount/history/reconnect freshness. Existing sound runtime, dice integration, combat scene, and full combat flow tests remain in the bounded regression batch.

`tools/second-dawn-combat-audio-review.mjs` generates an ignored deterministic **fixed-human-viewer** harness using the actual Board and engine fixtures. The ordinary playable preview intentionally switches viewer seats and remounts the observer; the no-replay boundary correctly keeps those observer switches silent, so it is unsuitable for testing a continuing player's sounds.

Chromium and WebKit checks:
- one actual cannon buffer starts after committing a live volley with animations disabled;
- an all-miss volley produces no impact/explosion;
- final ship destruction emits one explosion even when the game advances to upkeep;
- initial/reloaded views remain silent;
- real 3D dice settle before the cannon scene sound;
- all four cues render finite nonzero audio via OfflineAudioContext, with peak 0.0882 at the default effects volume 0.35;
- no browser page errors.

Evidence and listenable WAV files: `coding_agents/second_dawn_combat_audio_review/`.

## Review limits

Waveform rendering, browser playback initiation, gating, timing, and lifecycle checks are verified. No subjective human listening/playtest claim is made. These are restrained synthesized effects; user feedback can refine their timbre without changing the rules or sound controls. Full integration lint/build is recorded by the supervisor.

Final verification: **38 tests across six files passed**, all changed-code ESLint checks passed, and both browser engines passed the complete live-cue and real-3D-settlement script. Supervisor reports full repository lint and production build passed including the final-volley fallback.

Released on main as cc3a580. Vercel production deployment dpl_84VGJhJ1R78WU6rE3UmmaH6dupq1 is Ready. A production browser smoke verified the new Game effects copy on eclipse-rougelike.vercel.app without page errors. Full audio sequencing/3D assertions use the documented local actual-Board harness.
