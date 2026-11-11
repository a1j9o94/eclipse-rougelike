# Native dialog maintenance status

Outcome: the browser owns modal focus containment and inertness, while existing game panels retain their content, styles, close policy and action callbacks.

## Delivered

- One `NativeDialog` primitive handles `showModal`, native cancel/close, primary or surface focus, close-once notification, StrictMode cleanup and stale close events.
- `GameDialog`, preferences/menu settings, fleet inspection and standalone public inspection use the primitive. Existing backdrop and inner-panel classes remain intact; native element defaults are reset in a small dedicated stylesheet.
- A backdrop dismissal requires both press and release on the backdrop. Settings and ordinary game dialogs permit dismissal; required notices, fleet and public inspection retain their explicit-close policies.
- Shared-map public inspection remains non-modal, has no `aria-modal=true`, and does not intercept Tab. Its Escape/close behavior and connected-invoker focus restoration remain.
- Escape key propagation is stopped at modal surfaces without preventing its native cancel action, so an enclosing choice workspace is not minimized accidentally.

## Validation

The initial native lifecycle test run failed five of six cases against the original implementation. After implementation, all eight lifecycle cases pass: native opening, browser-owned Tab, exactly-once cancel/close, StrictMode stale events, current callbacks, programmatic close, unmount, backdrop drag boundaries, disabled primary avoidance, connected and removed invokers, reopening, and ancestor Escape isolation.

Eleven relevant test files passed (76 tests before the final two added lifecycle cases), covering settings persistence, recovery/rollback, fleet contents, public information, action confirmation, turn notices, choice draft preservation, covered-dice behavior and board integration. Targeted ESLint passed. A project TypeScript run reached only contemporaneous board-extraction errors; the supervising agent owns the integrated build gate.

The jsdom setup supplies missing dialog methods and focus restoration only. It intentionally does **not** fake native Tab navigation, Escape synthesis, top-layer rendering or inertness. Prior custom-trap unit assertions now test native modal delegation; actual browser checks remain mandatory.

## Browser acceptance owned by supervising review

Compare existing panel geometry/content with the baseline at narrow portrait, short landscape, tablet and desktop sizes. Verify initial focus, forward/backward Tab, Escape, invoker restoration, background pointer/keyboard inertness, touch backdrop cancellation, long-panel scrolling and header-close visibility. Check settings/fleet/public alongside choices, dice and skip controls: closing an overlay must not submit, discard a draft, minimize a choice, replay dice or leave an invisible blocker. Shared-map inspection must leave the galaxy operable. Record any browser-engine coverage limits explicitly.

Rollback: restore the migrated components, remove the primitive/style and scoped dialog test shim. Gameplay/rules and network contracts are untouched.
