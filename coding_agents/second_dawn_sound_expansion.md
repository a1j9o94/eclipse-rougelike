# Opt-in tactile effects and ambient music — Plan A

Outcome: players who enable audio hear restrained tactile interaction/result cues and a quiet original ambient bed while every rule and authoritative result remains unchanged.

Acceptance: new game effects default OFF at 35%, music OFF at 15%; dice controls retain existing defaults. Independent saved toggles/volumes/previews work across tabs and blocked-storage sessions. No hover, typing or scrolling sounds. Submission suppresses the generic click and successful cues require accepted receipts or fresh visible public AI actions. Dedupe by match/revision; consume hidden, history, reconnect and skipped events without backlog. Motion settings do not mute audio. Hidden/unmounted playback stops; music fades on leaving, ducks for dice and runs only in match/preview with at most four oscillators. Original 90-second smooth pads/sparse notes; no assets, services or game RNG.

Fail-first tests: new defaults/persistence; no pre-accept or duplicate/backlogged cues; visibility/connection/history suppression; volume/voice bounds and cancellation. Relevant existing dice/settings tests, lint, build, Chromium/WebKit settings/runtime evidence and rendered audio artifact follow. Human subjective listening is reported separately.

Risks/rollback: browser autoplay can refuse unlock (silent fallback, no deferred old cues). Revert cosmetic modules/hooks/settings independently; no save or backend migration. Parent owns integration and release.

Decision log: shared prepared dice bus avoids a second AudioContext; local command receipt is the authoritative cue boundary. Only public AI presentation entries are considered. New settings use separate versioned keys.

## Delivered behavior

- `SoundSettingsControls` adds saved game effects and ambient preferences, separate from existing dice and animations. Music can be previewed for eight seconds without enabling the persistent channel; effects have their own explicit preview. Preview cancellation also covers late browser unlocks, closing settings, hiding the document and leaving its route.
- `useGameSoundFeedback` exposes a typed cosmetic API and consumes accepted command receipts only after the matching revision reaches the visible player view. A whole fleet move makes one cue. Placement and installation use distinct cues. The capture/bubble handshake suppresses a generic click when the same interaction submits an action. Skip/close/minimize stop an effect without starting a replacement click.
- AI sound uses fresh public presentation metadata only, while the corresponding action panel is visible. Initial history, older entries, history/recap review, hidden documents, reconnects and repeated revisions are consumed silently. Private AI decisions have no audio presentation path.
- `useSoundscape` shares the existing dice AudioContext/compressor and unlock lifecycle. New effects are capped at six brief voices, in addition to the original dice cap; the ambient bed uses four oscillators. Volume changes update gain without restarting music. Dice impacts duck the bed and its preview, and the bed fades on leaving. An explicit route listener covers React lazy loading that retains the old mounted screen temporarily.
- The original 90-second composition uses three slowly moving sine pads and one sparse upper voice, with smooth endpoints and no beat, lyrics, borrowed samples, audio dependencies or audio service. Playback is generated locally; the OGG files below are review artifacts, not shipped game assets.

## Verification

**102 tests across 17 relevant files passed**, including 26 new sound cases and existing dice, settings, exploration, build, movement, research and AI presentation tests. `npm run lint` and `npm run build` passed. Existing Vite large-chunk and stale Browserslist notices remain informational.

The tests ran with `NODE_OPTIONS=--no-experimental-webstorage node node_modules/vitest/vitest.mjs run --maxWorkers=1 <selected files>` because Node 25's experimental global localStorage otherwise shadows jsdom storage. The normal npm test script overwrites NODE_OPTIONS. No application or test-environment configuration was changed to hide that machine-specific issue.

Fail-first evidence includes missing new preference exports/controls; invalid preview volume producing a source; synthesis failure escaping into the match; route departure failing to fade before unmount; missing awaited shared unlock for an explicit preview; Skip starting a replacement click; and a reused mounted board retaining the previous match’s AI revision boundary. Each was fixed and the corresponding assertion now passes. The broader receipt, deduplication, hidden/history/reconnect, voice-bound and ducking tests preserve the delivery contract.

The agent-browser dev check confirmed a rendered preview, working controls and no page errors. [Chromium and WebKit results](second_dawn_sound_review/results.json) cover 1440×900 and 390×844, plus cold-start previews with every channel muted. They verify defaults, saved levels, one shared context, nonzero real output, exactly one detent and accepted placement, automatic preview expiry, preview cancellation, hidden-tab silence, a fresh four-voice bed on return and silence after route departure. No page errors were recorded. [Desktop screenshot](second_dawn_sound_review/chromium-desktop.png) and [mobile screenshot](second_dawn_sound_review/webkit-mobile.png) were visually inspected.

[Existing dice playback checks](second_dawn_sound_review/dice-results.json) also passed for animated, sound-only, muted, zero-volume, skipped and minimized dice in Chromium and WebKit, plus settings persistence at both sizes. The transient skip control now receives an immediate pointer click after its visibility check; this avoids Playwright waiting for animation stability until the short-lived button disappears.

## Audio review artifacts and limits

- [Complete 90-second ambient bed](second_dawn_sound_review/ambient.ogg), rendered at the initial 15% music level.
- [Seven effects](second_dawn_sound_review/effects.ogg), one per second at 35%: selection, detent, confirm, tile, move, install, reject.
- [Render measurements](second_dawn_sound_review/render-metrics.json): ambient peak 0.05392/RMS 0.01970; effects peak 0.05522/RMS 0.00424. Neither clips; endpoints are silent and the largest adjacent sample changes are 0.00308 and 0.00910 respectively at 22,050 Hz.

These are actual OfflineAudioContext renders from the same synthesis code used by the game, accompanied by browser analyser evidence. No human subjective listening, physical iPhone test or newcomer/expert playtest is claimed. Human headphone/speaker review of timbre, comfort and repetition remains a follow-up. Parent owns integration, release and any further tuning after listening.

## Reproduction and rollback

`node tools/second-dawn-sound-expansion-review.mjs` verifies the new channels against a dev server (default `http://127.0.0.1:5198`; override `SECOND_DAWN_SITE_URL`). `node tools/second-dawn-render-sound-review.mjs` regenerates WAV files and measurements under ignored `.second-dawn/sound-review/`; the checked-in OGG listening copies were encoded from those WAVs. `tools/second-dawn-dice-sound-review.mjs` verifies preserved dice behavior.

No engine, rules, authoritative RNG, save schema, backend, dependency or deployment configuration changed. Reverting this cosmetic feature restores the previous presentation; existing dice keys remain intact. The two new channels remain opt-in until explicitly enabled in this browser.
