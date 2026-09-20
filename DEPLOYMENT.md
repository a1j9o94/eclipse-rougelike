# Second Dawn deployment

The Vercel project deploys `main` from this repository through its Git integration. `vercel.json` disables deployment for other branches. Do not create separate branch deployments or bypass the Git release flow.

- Live frontend: https://eclipse-rougelike.vercel.app/
- Convex deployment: `dev:ideal-nightingale-55`
- Frontend backend URL: `https://ideal-nightingale-55.convex.cloud`
- Convex dashboard: https://dashboard.convex.dev/t/adrian-obleton/eclipse-rougelike/ideal-nightingale-55

The live site intentionally uses the development Convex environment. Backend and frontend versions must remain compatible. Vercel’s current `build:vercel` builds only the frontend; it does not publish Convex functions. Publish backward-compatible backend changes to the explicitly selected development deployment before releasing the frontend on `main`:

```sh
CONVEX_DEPLOYMENT=dev:ideal-nightingale-55 npx convex dev --once --typecheck enable --tail-logs disable
```

Check that no deploy-key or self-hosted environment override selects another backend. The older `check-convex-release.mjs` script belongs to a previous coordinated-build configuration. `second-dawn-live-build.mjs` is a browser smoke test, not a deployment script.

For local checks, `npm run build` regenerates Convex API types, checks TypeScript and produces `dist/`. `npm run build:vercel` checks types and builds the frontend using the configured environment.

After an authorized merge/push to `main`, verify that Vercel's Git deployment reports the intended commit and becomes ready, then smoke-test the canonical live URL. Deployment troubleshooting and prior verification records live under `coding_agents/`.

## Retired data compatibility

The old roguelike and incomplete standalone game endpoints were removed from the source tree. Existing legacy table definitions in `convex/schema.ts` remain unchanged so that deployment does not incidentally delete or invalidate stored data. Current saves use the isolated `eclipse*V1` tables. Removing old database data would be a separate, explicitly scoped migration; this source cleanup does not perform one.
