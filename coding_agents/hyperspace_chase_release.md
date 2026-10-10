# Hyperspace Chase music — October 10, 2026

Outcome: play Adrian's selected audition C at 120 BPM in menus and matches, with a seamless musical loop and the existing saved music controls.

Acceptance: sampled tenor sax, clean guitar, clavinet, Rhodes and finger bass retain the approved arrangement; 20 bars repeat at 120 BPM without the audition fade-out. Music loads once per audio context, remains continuous through navigation, and never starts after mute, hide or unmount while loading. Fetch/decode failure is silent and retryable without a retry loop. Volume, dice ducking and eight-second preview remain supported.

Tests first: replace the procedural arrangement test with encoded-track caching, deferred start, cancelled loads, failure recovery, one-source looping and fade cleanup tests. Add app-scoped failure cleanup coverage. Run existing soundscape, preview, feedback, presentation and menu-settings regressions. Required gates: lint and production build. Validate encoded audio duration, loudness, clipping, and seam.

Decision log: ship a pre-rendered MP3 with a hashed Vite URL to preserve the sampled instruments and avoid loading a synthesizer/sample bank in the browser. Native Web Audio loops one decoded buffer. Original audition source is retained as a reproducible offline renderer; instrument samples use GeneralUser GS by S. Christian Collins. No backend changes.

Risk and rollback: failed audio loading remains cosmetic and does not block play. Revert this release to restore the previous synthesized space-jazz loop. Follow-ups: none planned.

Status: implementation complete; 45 relevant tests across eight files, lint, and production build passed. Encoded loop decodes to exactly 40 seconds, peaks at 0.539, and has a 0.00163 sample jump at the seam. Ready for merge and production verification.
