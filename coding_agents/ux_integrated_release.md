# Second Dawn integrated UX release — 2026-09-18

## Outcome and implementation

The first P1 implementation is extended across P2–P5. Build begins with an order tray, map deployment, relocatable ghosts, installed capability cards, explicit funding and atomic commitment. Movement queues ordered routes against projected public ship positions, with a direct Execute path for one selected route. Inspection leaves drafts and the underlying map camera intact.

Fitting groups parts by function and explains unique Ancient copies, same-slot undo, class-wide changes, exact installation counts, and permanent outside-grid components. Colonization spans sectors with explicit gray/orbital resource choices, exact nonlinear income/cube/colony-ship previews, and one commit. Exploration retains its location through placement and subsequent choices; discovery confirms within the selected reward. Influence and diplomacy show territory/relationship consequences in context.

Combat uses persisted dice in an editable volley tray, target-specific hit and damage previews, split allocations, and optional authoritative impact playback. Public history and score categories open inspectable public contributors in a separate map. Turn boundaries use contextual Done verbs and Pass for this round. Motion can be disabled and OS reduced motion is honored.

## Review fixes

Sol and Terra implemented and cross-reviewed separate systems. Parent reviewed actual code and integration, including:
- Build/Move workspace switching, complete multi-sector atomic command, fleet inspection preserving the order, receipt lag, and legal-only Build-here placement.
- Embedded desktop build layout and mobile map/tray structure.
- Same-slot Ancient restoration without permitting relocation; stored inventory remains authoritative.
- Direct movement execution includes the selected route rather than silently dropping it.
- Explicit multi-resource colony choice and removal of repeated scroll jumps.
- All public volleys retained in history rather than only the first group; optional sector metadata for contextual playback.
- Independent inspection camera, keyboard focus/escape/restore, missing old references, private score boundaries, and exploration position continuity.

## Verification before release

- Full `npm run build` passed, including Convex codegen, TypeScript, Eclipse typecheck, and Vite.
- All 26 changed test suites passed in bounded batches: 157 tests.
- Nine additional integration/crossflow suites passed: 38 tests (some overlap with changed suites).
- Five backend compatibility suites passed: 52 tests (some overlap): battle engine, history projection, Convex history, protocol and protocol review.
- ESLint passed for all 59 changed/new TypeScript files.
- Repository-wide lint remains the identical baseline: 88 errors and 12 warnings. Existing CSS/minification/chunk warnings remain.
- Public live-browser verification follows deployment. Local preview was blocked by the supported cloud browser. Automated tests do not establish human delight or physical-device usability.

## Compatibility and deployment boundary

Frontend core workflows use existing command contracts. No rule balancing, RNG changes, save deletion, privacy relaxation, or deployment configuration changes.

Rich combat source/weapon provenance and resolved neutral/player impact playback require the additive `shared/eclipse` backend changes to be published to the established development deployment `ideal-nightingale-55`. Old payloads remain playable with honest missing metadata labels and text-only old history. The current execution environment has no Convex deployment credentials; Vercel's frontend build deliberately does not publish this backend. Do not mark rich live replay deployed merely because Vercel succeeds. Isolated engine review fixtures run the new engine locally in the browser and can exercise the new events.

Release through PR #87 and the existing main-only Vercel configuration. Do not change the configured Convex project or introduce a temporary build-command workaround. The prior P2 planner checkpoint is remote commit `4ea488f6df3655f7e1ede63878ff963efde71256`; final release provenance will be appended once known.

## Human playtest

Start with `?position=workflow-build#second-dawn-preview`, `workflow-move`, `workflow-research`, `combat`, and `midgame`. These positions are isolated from saved guest matches. Test choosing two pieces then deploying, split fleet routes, fitting a stored discovery part, explicit gray colonies, same-card research, public inspection/return, and dice allocation. Record confusion and enjoyment separately from task completion. P0 baseline observation and newcomer/expert experience validation remain pending.

## Production verification and final layout follow-up

PR #87 merged as `f2869d0106573d088669595f84590e2841369ed7`. Vercel reported success at `https://vercel.com/obleton-adrian/eclipse-rougelike/BxFwEs2iSmRXuDCT6Dd1JB6eyvfa`. The public alias serves the new affordable-actions header, embedded build order, and contextual turn labels.

Live browser checks on isolated fixtures confirmed: adding an unplaced ship, public fleet inspection and return without losing that order, keyboard map placement, accepted build with the tray cleared and remaining Build capacity open, local research confirmation, and ownership-confirmed “Acquired” feedback. Desktop screenshot review found the build footer too low in its sidebar; the follow-up makes the planner a bounded scroll area with a visible footer and a wider desktop column. The final layout patch also improves singular build labels and avoids showing hidden reputation as a visible zero. Thirteen relevant tests and the production build passed for this follow-up.

The explicit Convex push to `dev:ideal-nightingale-55` was rejected by automatic approval review: it changes a shared backend and the review requires specific authorization for this target/deployment action. Do not retry indirectly. Frontend deployment is unaffected. Ask the user to authorize publishing the backward-compatible combat metadata to that existing deployment; authenticated deployment access will also be necessary. No backend rollout or full rich saved-game replay is claimed.

### Subsequent authorization and deployment configuration

The user subsequently explicitly confirmed deploying this existing backend. The
workspace login exchange was blocked, so the user configured its deploy key in
Vercel and confirmed proceeding. The durable, target-checked deployment setup and
current rollout status are recorded in [UX Convex release](ux_convex_release.md).
That authorized release supersedes the earlier pending-approval and separate-build
instructions above; no deployment to a different Convex target is authorized.
