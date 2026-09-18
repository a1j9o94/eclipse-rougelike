# UI deployment recovery

## Outcome

Vercel production deployments publish the Vite client without waiting for a
Convex publish. This makes UI-only releases independent of backend credentials
and Convex deployment availability.

## Decision

`vercel.json` now runs `npm run build:vercel`. The former command ran a guarded
`npx convex deploy` for every push to `main`; that step held the current
UI-only release in Vercel's pending state even though this release contains no
files under `convex/`.

Backend changes must be published deliberately before their corresponding
frontend release, using the existing target guard:

```sh
node tools/check-convex-release.mjs && npx convex deploy --cmd 'npm run build:vercel' --cmd-url-env-var-name VITE_CONVEX_URL
```

The release must target the approved development deployment
`ideal-nightingale-55` and use its deploy key. Do not commit credentials.

## Acceptance criteria

- A Vercel deployment from `main` runs only the Vite/TypeScript frontend build.
- The project remains main-only for Git-triggered deployments.
- The configuration test prevents reintroducing an implicit Convex publish.

## Validation

- `node --test tools/verify-vercel-build-config.test.mjs`
- `npm run build:vercel`
