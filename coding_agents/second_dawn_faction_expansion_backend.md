# Expanded faction rooms and persistence

Outcome: create and resume games with the four added factions, independent piece colors, and the correct pinned rules.

Acceptance: existing rooms default to base; new clients can request expanded-v1; incompatible faction choices clear when changing roster; no duplicate factions/colors; saved snapshots and public views preserve profile/colors; human and AI commands commit under that profile's versions.

Risks and rollback: optional schema fields preserve existing rows. Base pins remain unchanged. Keep expanded saves pinned; hide expanded creation if rollback is needed rather than interpreting them as base games.

Fail-first tests: second_dawn_expansion_rooms.spec.ts initially failed on unsupported factionProfile arguments and unavailable expanded catalog lookup. Add ownership, duplicate/stale, six-seat, compatibility and version checks before release.

Decision log: omitted API profiles stay base for compatibility, while the new launcher explicitly selects expanded-v1. A profile change clears unavailable or conflicting choices and readiness. Colors are resolved server-side. Expanded AI candidates are shuffled using Convex replay-stable mutation randomness.

Validation so far: 7 expanded adapter tests pass, including 2–6-seat setup, unique colors/factions, profile switching, stale/duplicate requests, owned Magellan conversion, expanded AI worker commits, and a pre-expansion snapshot with neither profile nor colors. The existing room, solo-room, multiplayer-review and match-adapter batches also pass (19 tests). Changed backend files are lint-clean. Full integration build follows concurrent UI/engine completion.

Independent review: compared Ragnarok and Magellan original boards with implementation. Reported missing Ragnarok blank blueprint slots; engine agent corrected five-slot Interceptor and Cruiser. Confirmed Magellan home 233 despite OCR reading 293. Browser-reviewed Midas extra activation and requested direct navigation to the purchased action; screenshot-reviewed desktop/mobile mixed-action controls and requested clearer current-action status.

Final integration: lint and production build pass on main after merging sound, history, trackpad, faction and turn-attention changes. 197 tests across 29 files pass in five memory-bounded batches (68 engine, 26 adapters, 30 audio, 44 expanded UI, 29 attention/navigation/history). Chromium and WebKit expanded workflows pass at desktop and mobile sizes; turn/upkeep notice review confirms opening upkeep does not submit it. Fixed a notice overlapping build confirmation and reran all 16 expanded browser cases. Audio renders and browser behavior were reviewed; subjective human listening and faction balance playtests are not claimed.

Deployment: Convex development deployment ideal-nightingale-55 updated successfully with schema validation and type checking on September 19, 2026. Existing base saves remain supported. Frontend release uses only the main-branch Git integration.
