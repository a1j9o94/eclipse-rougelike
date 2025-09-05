Convex Integration Summary
Issues Encountered
**Blank screen on multiplayer** when `VITE_CONVEX_URL` was missing, causing `ConvexReactClient` to be `null` and rendering the fallback UI without a message.
**Preview builds failing** because Vercel's Preview environment used a production `CONVEX_DEPLOY_KEY`, which `convex deploy` rejects when the build is not flagged as production.

## Current Codebase State
- `src/main.tsx` validates `VITE_CONVEX_URL` at runtime and shows an explicit error if the variable is missing, avoiding silent failures.
- Convex schema and functions live under `convex/`, defining `rooms`, `players`, and `gameState` tables used for multiplayer.
- Multiplayer entry points are disabled in the UI, but the Convex backend remains in place for future use.

## Vercel Environment Configuration
- **Production**: `VITE_CONVEX_URL` and `CONVEX_DEPLOY_KEY` are set for the live Convex deployment.
- **Preview**: These variables must point to a separate staging Convex deployment. Using production keys in Preview causes builds to fail.

## Local Development
- With `VITE_CONVEX_URL` configured locally, multiplayer features run correctly; `ConvexReactClient` initializes and connects to the Convex dev server.
