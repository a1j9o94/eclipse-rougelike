# UX backend release through Vercel

## Outcome and authorization

Publish the additive combat provenance and impact history from the merged UX
release to the existing `dev:ideal-nightingale-55` backend, so saved games receive
the same rich dice playback as isolated fixtures. The user explicitly confirmed
deploying this backend, then confirmed saving its deploy key in Vercel after the
workspace device-login exchange was blocked. This supersedes the earlier pending
authorization note in `ux_integrated_release.md`.

## Deployment configuration

Vercel remains main-only. Its Production environment must contain:

- `CONVEX_DEPLOYMENT=dev:ideal-nightingale-55`
- `VITE_CONVEX_URL=https://ideal-nightingale-55.convex.cloud`
- `CONVEX_DEPLOY_KEY`: a development deploy key for that exact deployment, stored
  only in Vercel's secret store with deployment permission.

The release guard validates the key's deployment prefix, both public selectors,
and Vercel environment before invoking Convex. It never prints the key. This
prevents the previously stored `greedy-mongoose-499` production key from silently
redirecting publication. Preview and local frontend builds retain the standalone
`npm run build:vercel` command; preview automatic deployments remain disabled.

The supported `convex deploy --cmd` flow builds the frontend before pushing the
backend, and a failed push fails the Vercel release. No temporary command override,
new backend, game-data mutation, or credential committed to Git is required.

## Acceptance and validation

- Red/green process-level tests cover the accepted target, missing/empty key,
  wrong development/production/preview keys, inconsistent selectors, preview
  environment, and absence of secret disclosure in diagnostics.
- Run the existing production build and Convex typecheck before merge.
- Confirm Vercel success for the merged commit, then check live backend responses
  and the public game. Do not claim saved-game combat replay was exercised unless
  an actual saved-game volley was observed.

## Risks and rollback

A missing, incorrect, or insufficiently permitted key stops the build before
publication; the previous Ready frontend remains live. Fix the secret in Vercel
and redeploy the same main commit. An approved backend push is additive and retains
existing saves. Reverting the build-command change restores frontend-only releases;
it does not undo backend publication. Keep rich combat fields optional for existing
history. Do not roll back by deleting tables or recreating the deployment.

## Status

Nine release-guard tests passed after the failing-test baseline. Full `npm run
build` (including codegen) and explicit Convex TypeScript check passed. Root lint
retains the unchanged 88 errors / 12 warnings. Independent Sol review approved
target selection, build-before-push ordering, failure handling and credential
safety against the installed Convex CLI source.

The Vercel connector cannot currently read the
`obleton-adrian` team (403); deployment success will be checked through GitHub's
Vercel status and public live checks, without exposing the secret.

## Deployed and ready for playtest — 2026-09-18

- PR #89 merged as `fd59535e7766ec7d39b4ae2b6870d0984a5c3003`.
- GitHub's `Vercel – eclipse-rougelike` status reports **success** for that exact
  commit: https://vercel.com/obleton-adrian/eclipse-rougelike/BY2shp4ESYU6TcqGi2X7uCPumeBG.
  The committed build command requires the target guard, frontend build and Convex
  push to succeed. This releases the additive combat backend metadata as well as
  the existing frontend; it is no longer a frontend-only release.
- A read-only query to `ideal-nightingale-55` returned an empty match list for an
  invalid guest credential, preserving the guest privacy boundary.
- The public site's real UI created a new three-player Eridani saved game, added
  an interceptor to the build order, placed it in sector 222 and committed it.
  Revision 1 showed two ships, an empty build tray and one remaining activation.
- Navigating home and continuing restored revision 1, both ships and the remaining
  Build activation. Done building submitted, and scheduled AI turns advanced the
  game to revision 10 before returning control to the human.
- The release check did not play a saved game through a combat volley. Rich
  combat interaction was previously verified with isolated engine fixtures and
  backend tests; actual saved-game combat and physical-device human usability
  remain playtest items, not claimed observations.

Play: https://eclipse-rougelike.vercel.app/ . The isolated workflow review starts at
https://eclipse-rougelike.vercel.app/?position=workflow-build#second-dawn-preview .
