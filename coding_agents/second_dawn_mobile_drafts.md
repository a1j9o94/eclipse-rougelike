# Local mobile action drafts — 2026-09-08

Outcome: unconfirmed choices survive workspace navigation, portrait/landscape changes, and browser refresh without submitting commands or transferring choices between players.

## Contract and ownership

`ActionDraftProvider` partitions a typed local snapshot by public match ID and viewer seat ID. `useActionDraftState` retains the existing React state interface and falls back to component-local state when no provider is installed. Preview boards without a match ID use memory only. Camera and board navigation share the provider; the same planner components run on desktop and mobile.

Supported state includes selected sector/workspace/action, public research/exploration command drafts, research selection, selected ship class, player inspection, camera, build/move visibility and endpoints, movement ship selection, build counts and funding selection, per-class blueprints and hardpoints, influence choices, ordinary colonization selections, and trade resource/amount choices.

Storage is versioned, size-bounded, and validated against an explicit key/type whitelist. Only normal public command shapes are allowed; resolve payloads and reputation choices are rejected. Credentials, PINs, recovery codes, pending decision IDs, private draws, and hidden choice payloads are not persisted. Pending colonization and bankruptcy trade use local state while the server's pending decision remains authoritative.

## Revision and acceptance handling

Each meaningful draft retains its revision. An unrelated AI/history/server revision preserves it and disables confirmation until the player reviews current choices and costs. Each planner still performs its existing current-view legality validation. Invalid saved influence choices remain visible with an explanation; unavailable saved colonization squares cannot silently turn into a smaller submitted order. Camera and navigation changes do not themselves require action review.

The provider's guard exposes meaningful `draftKeys` for resume affordances. It exposes `markSubmitted(command)`, which the board calls before forwarding the human command. This records only an in-memory signature of the affected draft entries. Parent prop `lastAcceptedCommand` is a fresh object only after an authoritative successful receipt; unchanged state keeps the same object. On acknowledgement, only matching, unchanged draft entries are cleared. Navigating or receiving a new revision never implies acceptance.

A duplicate accepted receipt can have an older revision than the current board after an earlier response was lost. The provider recognizes the new successful receipt object, rather than requiring a greater receipt revision. Draft edits made while an earlier request was pending are retained if their signatures differ. No command is submitted during restoration, review, or a storage update.

The build modal includes its own review/discard notice because the native dialog makes the underlying board inert. If storage becomes unavailable, the current draft remains in memory and stale review remains available. The warning explains that keeping the tab open is necessary to retain unconfirmed choices.

## Tests and browser evidence

Failing-first coverage includes partitioned restoration, stale revision review, explicit accepted clearing, malformed/secret-bearing storage rejection, standalone fallback, build-modal review, recovered duplicate receipts, and quota/storage failure recovery. Additional component checks restore real blueprint hardpoints and movement ship selections after unmount/refresh without submission. The bounded draft/planner/shipyard batch passes 43 tests across seven files.

Logs: `coding_agents/logs/second_dawn_action_drafts_red.out`, `second_dawn_action_drafts_modal_red.out`, `second_dawn_action_drafts_recovery_red.out`, `second_dawn_action_drafts_components.out`, `second_dawn_action_drafts_lint.out`, `second_dawn_action_drafts_types.out`, `second_dawn_action_drafts_build.out`, and `second_dawn_action_drafts_full_lint.out`.

Independent browser review used the production Board with an isolated synthetic match ID and a public engine fixture: camera survives Research/Galaxy navigation, rotation and refresh; a cruiser build survives refresh; a new revision disables confirmation; review permits exactly one engine-accepted build. No cloud game was modified. Evidence and script: `coding_agents/second_dawn_mobile_draft_browser/` and `tools/second-dawn-mobile-draft-browser.mjs`. This is browser emulation, not physical phone testing.

## Risks, rollback, and remaining ownership

Unconfirmed drafts are local to the browser, not cross-device synchronized. Canonical Convex game state and identity recovery remain authoritative across devices. Storage failure does not create an offline command queue. An accepted command whose response is lost and whose tab closes before acknowledgement can leave a stale draft for explicit review after reload; it is never automatically replayed.

No backend schema or command-format changes were made. Rolling back the provider does not affect saved matches. Supervisor and shell/gesture agents own mobile layout, same-revision resume affordances, final browser review, and deployment.
