# Less Random verification — 2026-09-20

## Outcome and scope
Opt-in `less-random-v1`, following the archived May 20 2026 Régis Étienne rules for the supported faction catalog. Standard remains the default. See [plan and decisions](less_random_mode_plan.md), [combat interpretation](less_random_combat.md), and [source credits](faction_research/credits.md).

## Behavioral evidence
- 130 targeted integration tests across 23 files: all green. Includes finite inventories, draw/redraw and caps, trades, technology/development effects, reputation/Jokers, score, fair AI, rooms and saves.
- 71 tests in the Standard/protocol regression batch: all green; three Convex tests overlap the first batch.
- 10 visual component tests in four files: all green, including redraw remount and new tech effect badges.
- Full lint, generated API/application/domain TypeScript and production build pass. Existing warnings: old Browserslist data and >500KB JavaScript chunks. No all-tests invocation due memory constraint.
- Logs: `coding_agents/logs/less-random-final-tests.out`, `less-random-standard-tests.out`, `less-random-visual-tests.out`, `less-random-final-build.out` (ignored runtime logs).

Failing-first integration checks found and fixed: missing Convex development/discovery choice validators, Quantum-slot Antimatter Splitter omitted from estimates, post-battle discoveries requiring a hidden mapping absent in this mode, direct global outer-cap bypass, and stale exploration selection after a Joker redraw.

## Browser and visual review
Local ignored harness at `.second-dawn/less-random/review.html` renders the production board with deterministic engine state. No new public preview route.
- 390×844: reviewed reputation supply/draft and current/table Joker dice. Raised colored dice captions for legibility; controls remain in the scrollable decision sheet.
- 1440×900: reviewed research/development layout and Joker choice. Added bordered development cards and inline resource prices to match research tiles.
- Public discovery market has searchable visual cards, selected-card confirmation, and a distinct Magellan reservation flow. Text explanation expands for the selected reward.
- Browser exercised reputation add → upgrade → upgrade → confirm (accepted), Quantum Labs acquisition (accepted), then an outside-track Improved Hull purchase.
- Browser runtime errors: none observed in the reviewed local flows.

These are agent walkthroughs, not user playtests or a subjective attractiveness guarantee. No screenshot baselines were blindly accepted. Current artifacts are in `screenshots/less-random/`.

## Release
Release configuration: main-only Vercel Git integration; explicitly selected existing Convex development backend `ideal-nightingale-55`. No existing match is migrated.

### Live verification
- Feature commit `e886660` fast-forwarded and pushed to `main`.
- Explicit `convex dev --once --typecheck enable --tail-logs disable` published successfully to `ideal-nightingale-55`; no migration. CLI removed the obsolete local `convex.json` during its config cleanup; restored the tracked file to avoid unrelated changes.
- Vercel Git deployment `dpl_B4nzGx1dWvjZdw4u2W7Lgtr6zpfG` became Ready and received the canonical alias. GitHub reports success for the intended commit.
- Fresh browser guest created a Less Random solo room as Eridani versus Draco. Round 1/10 and public setup reputation rendered. Add → upgrade → confirm produced a public 2 VP reputation tile and 7 total VP; reload restored it.
- On the live board, purchased the Ancient Labs development and selected Money Cache from the public supply. Both commands completed; AI advanced and control returned to the human. No browser runtime errors or visible alerts.
- Follow-up faction wording now receives the selected mode: public Eridani reputation, variant Terran/Eridani/Mechanema conversion rates, Terran ban, and Draco’s three-sector draw. Additional faction/lobby/mobile tests: 20 passed; lint/build passed.
