# Space jazz music — October 9, 2026

Outcome: replace the ominous sustained ambient drone with an original upbeat, understated space-jazz groove suitable for menus and long strategy matches.

Acceptance: swung drums, walking bass, electric keys and a rounded melodic lead; 32-bar AABA variation; seamless looping; music on by default when no saved preference exists; one app-scoped loop through menus, lobbies and matches; menu mute and volume controls; saved mute, preview, dice ducking, visibility and app cleanup preserved. No changes to gameplay.

Decision log: synthesize a stereo PCM arrangement once per audio context and loop one buffer source. This keeps live node count bounded and avoids continually scheduling hundreds of instruments. Original phrases and chord progression, with no borrowed recordings or melodies.

Tests (must fail first): rendered signal finite/audible/stereo/unclipped with continuous boundary; cached buffer; single-source loop; immediate and faded cancellation cleanup exactly once. Regression: soundscape, preview, preferences, effects and dice audio. Required gates: lint and production build.

Risks and rollback: generation cost occurs once on first music request; buffer is cached per context. Revert this feature commit to restore the previous bed. Follow-ups: subjective listening feedback on tempo and timbre.

Status: 48 relevant tests, lint and production build passed. Full 24 kHz stereo rendering is finite with peak 0.55, RMS 0.105 and boundary jump 0.0017. Memoizing repeated instrument notes reduces first generation from about 815 ms to 214 ms; subsequent starts reuse the audio buffer. Browser playback verification was attempted but unavailable: Playwright download failed and the cloud browser cannot reach the local server. See `second_dawn_space_jazz_review.json`. React checklist: one app-level audio owner, stable listeners, cached synthesis, native labeled controls and saved preferences. Release uses the existing main-only Git flow.
