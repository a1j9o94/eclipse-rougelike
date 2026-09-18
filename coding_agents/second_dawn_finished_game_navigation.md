# Finished-game navigation and saved-game history

Outcome: a player finishing a galaxy can go Home or start configuring another game, while completed games remain available without crowding active saves.

Acceptance: Home exits both the room URL and selected match; Play again opens the existing faction/AI setup and creates nothing until Start game; active saves and waiting/playing rooms remain visible; completed records are preserved in a collapsed Completed games disclosure with explicit View results controls. Newcomers can see how to start again, and returning players can find an unfinished game without sorting past every prior result.

Implementation:

- `SecondDawnGame` provides `onHome` and `onPlayAgain` to the board. Both clear the selected room route and match, pending local request/receipt, and transient status. Play again opens existing solo setup. No room is deleted or left, no save is removed, and no server mutation runs during navigation.
- The room token is now stateful. Automatic room entry explicitly requires a current room token, preventing an already-loaded room subscription from reopening the just-exited game. Existing invitation URLs and explicit room navigation remain intact.
- `SavedGames` groups ongoing matches and rooms separately from collapsed completed history. Finished rooms are deduplicated against saved matches; an old completed room lacking a match-list entry retains a results link.
- No Convex or rule changes.

TDD: the first three finished-navigation tests failed before implementation (finished games still in Continue list, Home did not exit room, Play again did not open setup). They pass after implementation. Additional tests cover results opened directly from the home list, preserving a completed room without a corresponding match, and the loading state.

Verification:

- `npx vitest run --maxWorkers=1 src/__tests__/second_dawn_finished_navigation.spec.tsx src/__tests__/second_dawn_saved_games.spec.tsx src/__tests__/second_dawn_room_reauthentication.spec.tsx`: 8 passed.
- Scoped ESLint for changed launcher/components/tests: passed.
- `npm run typecheck:eclipse`: passed.

Risk and rollback: room auto-entry must not fight explicit Home navigation. The roomToken guard and navigation tests cover that race at the component level; no data migration is required. Reverting the launcher/component changes restores the previous presentation without changing saved records. Browser/end-to-end checks are tracked by the coordinating implementation review; this document does not claim a physical-device or human playtest.
