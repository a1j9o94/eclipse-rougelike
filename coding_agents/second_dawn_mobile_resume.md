# Mobile resume, public activity and launcher

Outcome: continue an existing game on a phone, understand missed public actions, and keep the same seat when signing in on a second device.

`eclipseOwnershipV1.lastSeenRevision` is optional metadata outside GameState. Existing ownership rows require no migration. `getMatchView` and `listMyMatches` expose only the requesting player's marker. Authenticated `markMatchSeen` rejects invalid/future revisions and advances monotonically; ownership resolution reuses the canonical player identity, so recovered sessions share the marker. Queries, AI jobs, failed commands and duplicate retries never advance it. New accepted human commands mark their accepted receipt revision in the same transaction.

The frontend captures one recap interval per visit/foreground recovery. Live AI revisions do not move that interval or dismiss it. A missing marker is labeled “Recent activity”; a previous marker produces “Since you last played.” Entries come only from the existing filtered public history, and older pages remain available. Explicit Continue game acknowledges the displayed interval. Server-persisted pending human decisions keep priority. This marker does not synchronize unconfirmed drafts between devices.

Foreground and websocket recovery fetch the authoritative view and disable submissions until the subscribed revision reaches the refreshed revision. Failed refreshes expose Retry refresh. Responses from an abandoned match/identity are ignored. Browser `navigator.onLine` remains advisory: the actual Convex connection is authoritative. No offline command queue was added.

Mobile launcher/profile/room CSS supports safe areas, scrolling, 44px controls and 16px input text. Selecting a faction on a phone scrolls/focuses its effects; View effects and Compare factions provide explicit paths between the list and detail. Existing desktop presentation is retained.

## Failing-first validation

- Two Convex marker tests failed on missing metadata, then passed. Cover recovered-device identity, stranger denial, monotonicity, malformed/future values, unchanged game revisions/journal, accepted human commands, duplicate retries and background reads.
- Three recap tests failed on missing implementation, then passed. Cover frozen boundaries, explicit dismissal, first-visit wording, public interval filtering and seat isolation.
- Two foreground tests failed before implementation, then passed. Cover subscription catch-up, foreground revalidation, old-match responses, failure and retry.
- Mobile faction focus/navigation and preview accepted-receipt regressions were written failing first and now pass. Preview receipts drive the same draft controller as real matches; fixture revisions alone never imply an accepted command.

## Browser evidence

`tools/second-dawn-mobile-launcher-review.mjs` checks home, profile form and setup at 360×800, 390×844, 430×932. Screenshots were reviewed for width, legibility and button reachability; no profile secret was entered or captured. `tools/second-dawn-mobile-resume-review.mjs` uses an isolated fresh player and actual development Convex match: a second browser signs in, restores its seat, sees public catch-up, and explicitly acknowledges activity visible to the first identity. Local and deployed runs passed.

`tools/second-dawn-mobile-live-play.mjs` creates a real untimed solo game through the mobile UI, drafts exploration, reloads the room, confirms the restored draft, rotates/discards the drawn sector, ends the action and observes the automatic AI action sheet. Local and deployed runs passed. An early deployed harness used the old “Details/Confirm action” selector after the new footer offered direct “Confirm”; the harness was corrected without changing the product. No game command is automatically submitted on restoration.

These are automated browser and agent review results. They do not establish physical Android/iPhone behavior or human task-search times. User Android feedback was requested after the first mobile deployment while accessibility refinement continued.
