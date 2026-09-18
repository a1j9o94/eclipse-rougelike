# Combat casualty feedback — September 18, 2026

Outcome: a destroyed ship stays visible as a named casualty with its silhouette, owner, HP change, and a clear Destroyed marker, including after the live battle disappears.

Acceptance criteria:

- Public volley metadata supplies ship identity; previous public ship snapshots support older events.
- Missing legacy metadata is shown honestly as Ship, retaining the event target ID; no type or owner is guessed.
- Damage and destruction look different and have readable text equivalents.
- Result cards do not require another Continue confirmation and do not disappear on a timer.
- Restrained impact motion respects reduced motion and both local skip and global fast settings.

Implementation: `BattleOverview.tsx` exports `CombatPlayback`, usable independently of an active battle, and forwards view/knownShips from the active battle overview. `battleOverview.css` adds casualty cards, crossed ship silhouettes, and a brief non-flashing impact glow. The parent board supplies recent public history and preserves the aftermath; the engine supplies optional public owner/type metadata for durable replay.

TDD: three initial behavioral tests failed against the previous playback (missing named casualty groups, missing neutral silhouettes, missing damage feedback). The implemented component passes five focused casualty tests plus all three existing battle-overview tests. Additional coverage checks previous public snapshots and global motion changes.

Validation commands:

```sh
npx vitest run --maxWorkers=1 src/__tests__/second_dawn_combat_casualties.spec.tsx src/__tests__/second_dawn_battle_overview.spec.tsx
npx eslint src/second-dawn-game/BattleOverview.tsx src/__tests__/second_dawn_combat_casualties.spec.tsx
```

Result: eight tests pass; scoped lint clean. Integration, browser review, full build, and release verification belong to the parent combat delivery slice. Human newcomer/expert playtest evidence has not been collected by these automated tests.

Risks and rollback: old saved journal entries cannot reconstruct an already-destroyed ship's identity after a fresh load without metadata; they retain a generic identified casualty. UI changes are presentation-only and can be reverted without modifying game state or combat rules.
