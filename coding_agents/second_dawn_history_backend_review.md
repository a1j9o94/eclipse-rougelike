# Persistent public action history

Outcome: players can review rapid AI turns after they finish, and reopen the same ordered history after reconnecting.

Implemented `shared/eclipse/history.ts` public projection and `getMatchHistory` in `convex/eclipseMatches.ts`. The authenticated guest must own a seat before any journal read. The query returns newest-first entries, default40/max100, with an exclusive revision cursor; newly appended AI commands cannot shift older pages. A limit+1 indexed read determines whether another page exists. Invalid cursors/page sizes fail validation.

Schema adds optional journal round metadata, recording the pre-command round. Existing rows remain compatible and show unknown round unless a public round phase message provides a value. No snapshot migrations or existing deployment data deletion.

Privacy audit: public return shape is exactly revision, actorSeatId, actorName, round, summary and details. Raw request/command IDs, decision IDs, private event messages, RNG, deck data, discovery choices and reputation values never cross this boundary. Resolve summaries read only the public kind. Retained/discarded reputation numbers are never interpolated. Public events must have literal public visibility; events addressed to any seat are excluded even for that seat's viewer. Research names, build component types, ship types, printed sector destinations and trade received amounts use public metadata. Internal seat tokens in public messages become faction names. Missing historical ship instances fall back to generic ship without exposing raw IDs.

Tests failed first for missing projector/query, then passed: field redaction, private-event exclusion, legacy/persisted round, real accepted action saved once on duplicate retry, ownership/invalid credentials, ordered pagination, reconnect repeatability, public research naming, correct received trade amount, build/move details and faction-readable messages. Existing match-adapter tests also passed. Scoped lint passes; production build passes. Full repository lint remains at 101 existing problems (89 errors, 12 warnings), separate from changed code.

The review fixture generator now captures public history from all 841 actual seed106 processed commands. Each of 22 existing fixtures receives its matching last100 entries newest first, clipped by the exact recorded revision. Opening history is empty. No fabricated AI rows and no change to seed or decision sequence.

Risks and rollback: query and optional metadata can be removed without changing authoritative gameplay or journal data. Public events rely on the engine's explicit visibility contract. Legacy history cannot reconstruct missing rounds exactly; UI must tolerate null. This work does not change rules or AI behavior.

## Live-page cache and reconnect correction

Reviewed the React history hook after integration. Reproduced two failures before the fix: an already-complete cache permanently hid missing revisions after a reconnect with more than 40 new commands, and changing guest credentials could render the prior credential's cached entries.

`useMatchHistory` now derives the next exclusive cursor from the newest gap in its merged revision sequence, then the oldest remaining revision. This uses the authoritative invariant that every accepted revision has one journal row, including redacted choices. Therefore reaching revision1 earlier does not suppress a later reconnect gap. Overlapping live and paginated rows merge by revision, with older entries retained. Cache identity includes guest credential and match. In-flight requests are guarded against duplicate paging and stale identity results are ignored. The public HistoryFeed API is unchanged.

Three focused hook tests cover complete-history → disconnect → 80 additional commands → gap fill, live updates arriving during an older page fetch, credential switching, ignoring an old response after the new identity loads, and duplicate concurrent click suppression. Reconnect preserves previously loaded rows throughout. Scoped lint and production build pass; full repository lint debt remains separate.

## Independent actual-browser closure

Ran tools/second-dawn-history-browser-review.mjs against local UI and the authorized Convex development backend. A new human-versus-two-AI guest match accepted the human pass; both human and AI actions appeared with faction names. Refresh/Continue retained previously recorded entries. No browser errors. Captured and inspected history at1366×768,1440×900,1920×1080; no document overflow and the wider upkeep header remains readable.

Browser review caught two additional defects before closure. Pure fixture processing left transport revision at0, so history filtering accidentally included future rounds with duplicate row keys. The generator now advances review transport revision once per accepted command and validates unique bounded histories. Replayed841 commands; deep comparison proved all22 fixture states unchanged except their transport revisions. Matching history now ends at each actual fixture revision. Secondly, an existing history row moved129.56px while AI rows arrived during reading. Parent disabled native scroll anchoring because manual anchoring already handles prepend growth. The same actual live-AI browser assertion now passes (see scroll-anchor-check.json) and real save/resume passed again. The script never records guest credentials.
