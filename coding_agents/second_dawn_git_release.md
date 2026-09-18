# Main-only Git release — 2026-09-18

Outcome: commit all approved full-game, multiplayer, visual, and mobile work; merge to main and use GitHub-triggered Vercel production releases.

## Decisions
- Vercel already links a1j9o94/eclipse-rougelike with production branch main. Earlier releases used direct CLI production uploads from the working branch; those did not update GitHub.
- vercel.json now permits automatic deployment of main only (`**: false`, `main: true`). Project-level Ignored Build Step also skips non-main refs, including older branches without this config.
- Dashboard build settings now match vercel.json: npm ci, npm run build:vercel, dist. Frontend build does not deploy Convex. Development backend remains ideal-nightingale-55.
- Commit source, tests, assets, plans and review evidence. Ignore credentials/environment files, runtime logs/PIDs, dependencies/build output, and invitation-bearing lobby screenshots; preserve these local files.
- Future releases: merge approved work to main, push main, verify the automatically created production deployment. Do not run production CLI deployment from feature branches.
- Official configuration reference: https://vercel.com/docs/project-configuration/git-configuration

## Verification before merge
- Second Dawn: 497 tests / 100 files passed (memory-bounded single-worker batch).
- npm run build passed, including Convex codegen, application/domain TypeScript, and Vite.
- npm run lint: unchanged inherited debt, 88 errors / 12 warnings. Not represented as a clean full-repository lint gate.
- git diff --check passed. Credential-signature scan found no secrets in pending source/text artifacts. Independent artifact review excluded invitation-bearing screenshots.
- Local raw validation logs: coding_agents/logs/git_cleanup_{tests,lint,build}.out (ignored runtime evidence).

## Acceptance / rollback
Verify local and remote main match, Git status is clean, and the new Vercel production deployment reports source git and the main commit SHA. Verify the public site still targets https://ideal-nightingale-55.convex.cloud. The previous Ready deployment remains available for rollback; no backend migration occurs in this release.
