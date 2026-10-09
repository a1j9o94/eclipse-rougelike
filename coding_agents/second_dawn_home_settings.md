# Home settings gear — October 9, 2026

Outcome: keep the home screen quiet by replacing its prominent music toggle and slider with one small settings gear beside the title.

Acceptance: home and room menus open the existing settings dialog for music, music volume, game effects, dice sounds/volume, 3D dice, animations and Follow AI. Music remains continuous when the panel opens. Choices save in the same browser keys and synchronize across menu/game consumers and other tabs. Reduced-motion defaults remain respected. Seat-specific auto-pass and match actions appear only inside games. Escape closes the dialog and restores focus to the gear.

Decision log: reuse GameSettingsPanel with an optional title; remove empty match-actions section when unused. Move motion and Follow AI from board-local state into shared external-store preferences. Keep the board's AI inspector behavior in its existing callback. Remove the former menu music component and CSS.

Tests: menu gear hidden controls until opened, settings contents, music/display persistence, live cross-game and other-tab synchronization, reduced-motion defaults, focus return. Existing dice settings, presentation preferences, audio lifecycle, AI presentation, app entry and room lobby regressions. Required gates: lint and production build.

Risk and rollback: preference keys and sound defaults are retained. Revert this commit to restore the visible menu music controls. No backend changes. Follow-ups: none planned.

Status: 60 relevant tests passed; lint and production build passed. React review confirms one shared settings panel, browser-wide preference subscriptions, labeled controls, a 44 px gear target and keyboard focus return. Production release pending.
