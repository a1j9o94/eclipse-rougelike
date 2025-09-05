Convex Integration Summary
Issues Encountered
**Blank screen on multiplayer** when `VITE_CONVEX_URL` was missing, causing `ConvexReactClient` to be `null` and rendering the fallback UI without a message.
**Preview builds failing** because Vercel's Preview environment used a production `CONVEX_DEPLOY_KEY`, which `convex deploy` rejects when the build is not flagged as production.

## Current Codebase State
- `src/main.tsx` validates `VITE_CONVEX_URL` at runtime and shows an explicit error if the variable is missing, avoiding silent failures.
- Convex schema and functions live under `convex/`, defining `rooms`, `players`, and `gameState` tables used for multiplayer.
- Multiplayer entry points are disabled in the UI, but the Convex backend remains in place for future use.

## Vercel Environment Configuration
- Production
  - `VITE_CONVEX_URL=https://greedy-mongoose-499.convex.cloud`
  - `CONVEX_DEPLOYMENT=prod:greedy-mongoose-499`
  - `CONVEX_DEPLOY_KEY=<prod key from Convex>`
- Preview
  - `VITE_CONVEX_URL=<staging convex url>` or reuse prod if no staging
  - `CONVEX_DEPLOYMENT=<preview/dev deployment>`
  - `CONVEX_DEPLOY_KEY=<matching preview key>`
  - Never mix production keys in Preview

## Local Development
- With `VITE_CONVEX_URL` configured locally, multiplayer features run correctly; `ConvexReactClient` initializes and connects to the Convex dev server.

## Resolution (2025-09-05)
- Root cause: Production build was missing `VITE_CONVEX_URL` (used only by Vite), while an unused `CONVEX_URL` existed. Preview also briefly used a production `CONVEX_DEPLOY_KEY`.
- Fix: Set `VITE_CONVEX_URL` in Vercel Production, scope `CONVEX_DEPLOYMENT`/`CONVEX_DEPLOY_KEY` correctly for Production and Preview.
- Verification: Deployed build logs show "Ran npm run build with env var VITE_CONVEX_URL set" and client console shows "Convex client created successfully".

## Guardrails
- Build fails in CI/production if `VITE_CONVEX_URL` is absent (see `vite.config.ts` using `tools/envCheck.ts`).
- Keep Preview and Production Convex deployments and keys separate to avoid accidental writes.
