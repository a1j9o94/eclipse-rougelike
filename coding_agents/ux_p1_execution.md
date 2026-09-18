# UX P0/P1 execution — September 18, 2026

Outcome: players can purchase research beside its benefits and cost, understand their affordable future actions, and continue moving ships without reopening the planner.

Branch: `feature/second-dawn-ux-foundations`, based on `0ff926cf5cfa1f0a6fbb465747e2d15f39990615`.

Acceptance: local research confirmation and explicit atomic funding; honest economy forecast and accessible accounting; acknowledged moves retain origin while activations remain; rejected/stale drafts survive; no rules, RNG, saves, privacy, or deployment changes.

Work allocation: Sol implements research; Terra implements affordability; Sol independently audits baseline and reviews regressions; supervisor implements movement continuity and integration. Human newcomer/expert playtests remain pending; agent checks cannot establish delight.

Fail-first tests: research local confirmation/funding/owned inspection and receipt feedback; affordability boundary and state cases; movement split destinations via consecutive accepted commands, rejected draft retention, receipt/view ordering, and exhausted action behavior. Existing draft/recovery and command suites remain regression gates.

Risks and rollback: preserve authoritative previews and receipt-driven clearing. No optimistic gameplay changes. Revert this frontend slice normally if needed; existing saves remain compatible. Full multi-route drafts, build deployment, fitting and combat are later slices.

## Implementation observations

- Baseline lint measured before feature edits: 100 findings (88 errors, 12 warnings), largely legacy/Convex. Changed-file lint will be checked separately.
- Movement tests first failed because confirmation immediately unmounted the planner. Consecutive engine-accepted commands now move two ships to distinct sectors with one action disc, retaining departure context. Pending/rejected commands preserve choices. Receipt-before-view ordering is tested with realistic revision advancement (the pure engine intentionally does not increment protocol revisions).
- Browser review attempted through the supported browser skill. Local Vite preview runs, but the cloud browser refuses the localhost URL with `ERR_BLOCKED_BY_CLIENT`. No visual-browser or human-playtest pass is claimed.

## Final combined validation

- `npx vitest run --maxWorkers=1 --testTimeout=15000` with these explicit suites: `second_dawn_research_workspace`, `second_dawn_research_readability`, `second_dawn_research_cost`, `second_dawn_researched_technologies`, `second_dawn_funding_ui`, `second_dawn_funding`, `second_dawn_movement_continuity`, `second_dawn_movement_planner`, `second_dawn_action_drafts`, `second_dawn_mobile_shell`, `second_dawn_affordability_capacity`, `second_dawn_upkeep_summary`, `second_dawn_action_economy`, `second_dawn_command_preview`, and `second_dawn_protocol` under `src/__tests__/` (their existing `.spec.ts`/`.spec.tsx` filenames): **84 tests passed in 15 files**. The larger per-test bound avoids render timeouts observed while agents were compiling/testing concurrently; final run used one worker.
- `npm run build`: **passed**, including Convex codegen, full TypeScript build, Eclipse typecheck, and Vite production bundle. Existing large-chunk warning remains. Temporary research type errors during parallel implementation were fixed.
- `npx eslint` on all 12 changed/new TypeScript source/test files: **passed**.
- `npm run lint`: **100 findings (88 errors, 12 warnings)**. Baseline and final lint outputs are identical; no new findings.
- `git diff --check`: **passed**.
- Independent Sol review identified and drove fixes for rejected Done-moving retention, alternate technology draft replacement, receipt ordering, mobile research overlay, and honest economy wording. See `ux_p0_baseline.md` for intermediate observations; this section is the final combined result.

## Remaining work

Visual desktop/mobile/keyboard/reduced-motion browser review and human newcomer/expert playtests remain pending. The cloud browser blocked local preview access; automated component tests do not establish visual quality or fun. Wider funding and turn-label consistency is still P1 follow-up. P2 adds build-first multi-sector deployment and full batched multi-route movement. Ship fitting, opponent inspection, direct colonization, and tactile combat remain subsequent slices. Production remains unchanged until this feature branch is reviewed and merged through the existing release workflow.
