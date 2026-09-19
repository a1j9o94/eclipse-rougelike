# Second Dawn deployment

The Vercel project deploys `main` from this repository through its Git integration. `vercel.json` disables deployment for other branches. Do not create separate branch deployments or bypass the Git release flow.

- Live frontend: https://eclipse-rougelike.vercel.app/
- Convex deployment: `dev:ideal-nightingale-55`
- Frontend backend URL: `https://ideal-nightingale-55.convex.cloud`
- Convex dashboard: https://dashboard.convex.dev/t/adrian-obleton/eclipse-rougelike/ideal-nightingale-55

The live site intentionally uses the development Convex environment. Backend and frontend versions must remain compatible. Backend publishing is guarded by `tools/check-convex-release.mjs`, which checks the Vercel environment, deployment selection, URL and development deploy-key prefix without printing secrets. `tools/second-dawn-live-build.mjs` contains the coordinated backend/frontend build; Vercel's configured Git build remains the release entry point.

Environment values required by the coordinated release:

- `VITE_CONVEX_URL=https://ideal-nightingale-55.convex.cloud`
- `CONVEX_DEPLOYMENT=dev:ideal-nightingale-55`
- `CONVEX_DEPLOY_KEY`: a key for that development deployment, stored in the hosting environment rather than Git.

For local checks, `npm run build` regenerates Convex API types, checks TypeScript and produces `dist/`. `npm run build:vercel` checks types and builds the frontend using the configured environment.

After an authorized merge/push to `main`, verify that Vercel's Git deployment reports the intended commit and becomes ready, then smoke-test the canonical live URL. Deployment troubleshooting and prior verification records live under `coding_agents/`.

## Retired data compatibility

The old roguelike and incomplete standalone game endpoints were removed from the source tree. Existing legacy table definitions in `convex/schema.ts` remain unchanged so that deployment does not incidentally delete or invalidate stored data. Current saves use the isolated `eclipse*V1` tables. Removing old database data would be a separate, explicitly scoped migration; this source cleanup does not perform one.
