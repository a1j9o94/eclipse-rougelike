# Tutorial TODO (Next Session)

## Goals
- Define outcomes: teach build, upgrade, dock, reroll, basic combat; target 5–8 minutes.
- Decide reward: small credits/materials or cosmetic badge; persist completion.

## Entry & Scope
- Entry: first-run auto or explicit `Start Tutorial` on Start page.
- Phases: Outpost basics (build interceptor) → Upgrade path → Expand capacity → Reroll & buy → Combat intro.

## UX & Content
- Overlay: lightweight step callouts with next action, progress (e.g., Step 2/5), Skip/Exit.
- Copy: concise, action-first instructions with short hints; accessibility pass.

## Gating Logic
- Per-step checks to detect success (e.g., fleet length increased, credits deducted, focused ship upgraded).
- Soft-lock disallowed actions that break the flow (with explanatory tooltip).

## State & Plumbing
- Persist tutorial progress in localStorage; mark completion; allow reset.
- Thread `tutorialMode` through outpost/combat handlers to enforce gates.

## Implementation Plan
- Scaffold `src/tutorial/` with orchestrator, steps, and guards.
- Add minimal overlay component and callout anchor utilities.
- Hook into existing outpost handlers to validate or block actions per step.
- Add Start-page entry point (button) guarded by flag.

## Analytics (Optional)
- Emit step-completed events (count only) to console/dev logger; real telemetry behind flag.

## Testing
- Unit: step guards for build/upgrade/dock/reroll success detection.
- UI: happy-path test that completes tutorial quickly (batched to avoid OOM).

## Flags
- Env/local toggle to enable tutorial; default ON in dev, OFF in prod until ready.

