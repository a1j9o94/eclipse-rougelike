# Random starting positions — 2026-10-25

Repeated six-player games previously assigned the faction roster to the same physical starting slots. New direct solo games and room starts now shuffle the clockwise seat order using a deterministic stream derived from the fresh game seed. This changes locations and neighbours while retaining stable player IDs, ownership, factions, colours, home sectors and starting ships. The starter remains randomized independently.

The setup shuffle uses a separate salted stream; saved gameplay random state is unchanged. Omitted/false setup flags preserve historical fixture layouts, and existing snapshots are never reshuffled. Historical recovery starts from the saved physical seat order and reproduces shuffled games without schema changes.

Acceptance checks passed:
- A failing regression first reproduced identical positions for all player counts (2–6).
- New setup tests verify varying positions/neighbours, seed determinism, clockwise turns, correct home sectors/ships, guardians, immutable input and legacy opt-out.
- Both authoritative creation paths vary actual home positions and neighbours over 16 controlled seeds with the same six factions and stable human ownership.
- Shuffled setup with randomized starter and Minor Species retains exact historical checkpoint recovery.
- 98 relevant tests in 17 suites pass, including room/solo creation, expansions, custom rules, funding, queued actions and AI scheduling.
- `npm run lint`, `npm run build`, and `git diff --check` pass.

Release uses the existing main-only Git-triggered Vercel pipeline, which publishes the compatible Convex backend before the frontend. No migration is needed. Reverting the implementation commit restores fixed seating for future games without changing existing saves.
