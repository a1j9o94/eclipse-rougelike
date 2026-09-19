# Dice sound preferences — September 19, 2026

Outcome: players can set the dice clatter volume or mute it without extra confirmation, independently of animation preferences, and find Follow AI and auto-pass controls in Settings.

Acceptance criteria: sound defaults on at 60%; volume stays within 0–100%; local changes, remounts and other tabs stay synchronized; blocked browser storage uses a session fallback; muted volume controls cannot take keyboard focus; Settings retains its single header exit. Follow AI and auto-pass callbacks respect existing authoritative state and saving/connection guards.

## Decision log

- Added versioned local sound and volume keys and exported typed hooks/read accessors for the roll lifecycle.
- Sound and motion are independent preferences. Copy explicitly explains that dice sound works with animations disabled.
- Sound/display settings save in this browser; auto-pass remains a seat preference saved across devices. Settings describes the distinction.
- Follow AI and auto-pass props are optional so isolated settings consumers stay compatible. Existing board shortcuts can remain.
- Clamped volume values, rejected non-finite values with the 60% default, and excluded disabled inputs/buttons from the focus trap.

## Validation

Eight new tests failed before implementation (`coding_agents/logs/dice_sound_settings_red.out`). The new tests plus existing presentation-settings and panel-navigation regressions pass: 14/14 (`coding_agents/logs/dice_sound_settings_green.out`). Changed TypeScript and tests pass focused ESLint.

Tests cover default settings, immediate save, mute/volume remount persistence, cross-consumer and cross-tab updates, malformed/clamped volume, blocked storage, keyboard focus, independent animation/sound settings, follow-AI callbacks, and disabled/resume auto-pass behavior.

Parent supervisor owns full lint/build, browser review, audio-lifecycle integration and release verification. No audible quality claim follows from these preference tests. Rollback is confined to the settings UI/hooks and optional Board props; game rules are unchanged.
