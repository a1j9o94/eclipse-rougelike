# Second Dawn deployment

The Vercel project deploys `main` from this repository through its Git integration. `vercel.json` disables deployment for other branches. Do not create separate branch deployments or bypass the Git release flow.

- Live frontend: https://eclipse-rougelike.vercel.app/
- Convex deployment: `dev:ideal-nightingale-55`
- Frontend backend URL: `https://ideal-nightingale-55.convex.cloud`
- Convex dashboard: https://dashboard.convex.dev/t/adrian-obleton/eclipse-rougelike/ideal-nightingale-55

The live site intentionally uses the development Convex environment. Backend and frontend versions must remain compatible. The main-only Git build now runs `publish:vercel-backend` before compiling the frontend. It uses the existing Vercel Production secret and `tools/check-convex-release.mjs` to verify the environment, development deployment selector, deploy-key prefix, and frontend backend URL. Invalid selectors fail before Convex runs; keys are never printed. The compatible backend is published before the new frontend becomes live.

For a separately authenticated manual backend release, explicitly select the same deployment:

```sh
CONVEX_DEPLOYMENT=dev:ideal-nightingale-55 npx convex dev --once --typecheck enable --tail-logs disable
```

No deploy-key or self-hosted override may select another backend. `second-dawn-live-build.mjs` is a browser smoke test, not a deployment script.

For local checks, `npm run build` regenerates Convex API types, checks TypeScript and produces `dist/`. `npm run build:vercel` verifies and publishes the backend before checking types and building the frontend, and requires the configured Vercel Production environment.

After an authorized merge/push to `main`, verify that Vercel's Git deployment reports the intended commit and becomes ready, then smoke-test the canonical live URL. Deployment troubleshooting and prior verification records live under `coding_agents/`.

## Retired data compatibility

The old roguelike and incomplete standalone game endpoints were removed from the source tree. Existing legacy table definitions in `convex/schema.ts` remain unchanged so that deployment does not incidentally delete or invalidate stored data. Current saves use the isolated `eclipse*V1` tables. Removing old database data would be a separate, explicitly scoped migration; this source cleanup does not perform one.
