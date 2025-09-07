# Headless Sub-Agents Protocol

This repo uses file-based coordination for headless sub-agents. Keep updates concise, actionable, and TDD-aligned.

## Files & Locations
- Per-agent files: `coding_agents/subagents/<agent>.md`
- Shared log: `coding_agents/progress.md` (append-only)
- Step plan: `coding_agents/step_by_step_plan.md` (source of truth for tasks)

## Update Cadence
- Update your agent file when work begins, when blocking, and when handing off.
- Keep entries short: Status, Next, Decisions, Questions.

## Handoffs
- Add a log entry in `coding_agents/progress.md` prefixed with `@<agent>` and a short directive.
- If the next agent is blocked on your artifacts, link the path(s) explicitly.

## TDD & Quality Bars
- Write failing tests first; commit only when green (owner to follow up).
- No `any`/`unknown` unless justified; prefer shared types.
- Avoid behavior changes in scaffolding steps; keep pure functions pure.

## Ownership
- `planning_agent`: Plan integrity, priorities, block triage.
- `engine_agent`: Engine/controller/selectors scaffolding.
- `tests_agent`: Failing tests for initial commands/selectors.
- `mp_agent` (optional later): MP-specific fixtures and assertions.

## Minimal Entry Template
```
## YYYY-MM-DD HH:MM — Status
- Context: one-liner
- Next: concise next action
- Decisions: bullets (if any)
- Questions: bullets (if any)
```
