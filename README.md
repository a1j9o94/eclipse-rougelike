# Eclipse · Second Dawn

A browser adaptation of the Second Dawn base game with solo AI games, multiplayer rooms, resumable player profiles, and an interactive preview using the same board and command engine.

## Run locally

```sh
npm ci
npm run second-dawn:local
```

The local launcher starts an isolated Convex backend and Vite. To use an already configured backend, set `VITE_CONVEX_URL` in an ignored environment file and run `npm run dev`. Saved solo and multiplayer games require Convex; the playable preview runs from deterministic fixtures.

## Code map

- `shared/eclipse/`: typed rules, catalog, deterministic command processor, public views and AI planning.
- `src/second-dawn-game/`: game board, launcher, decision workflows and fixture preview.
- `src/second-dawn-session/`: identity, connection recovery, saved games and activity synchronization.
- `convex/eclipse*.ts`: guest/profile identity, matches, rooms, authoritative persistence and scheduled AI work.
- `src/__tests__/second_dawn*`: game, persistence, UI and AI regression tests.
- `coding_agents/`: implementation plans, source audits and verification evidence.

The former roguelike and its standalone demos were removed. Git history retains their implementation. Old database table definitions remain for safe compatibility with existing deployment data; the retired gameplay has no frontend or executable backend endpoints. `aiLegacy.ts` is a frozen Second Dawn AI benchmark opponent, not the removed roguelike.

## Validate

```sh
npm run lint
npm run test:second-dawn
npm run build
```

Tests run with one worker. `npm run test:batched` provides smaller sequential batches. Browser walkthroughs and deterministic visual tools are under `tools/second-dawn-*.mjs`; the public preview is `/#second-dawn-preview`.

## Release

[Vercel](https://eclipse-rougelike.vercel.app/) deploys pushes to `main` through Git integration. Feature branches do not deploy. The live site intentionally uses the existing Convex development deployment. See [DEPLOYMENT.md](DEPLOYMENT.md) for the configured release process.
