# Eclipse · Second Dawn

A browser adaptation of Eclipse: Second Dawn with solo AI games, multiplayer rooms, resumable player profiles, and an interactive preview using the same board and command engine.

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

## Faction rosters

New games default to **Expanded civilizations**: the base roster plus Rho Indi Syndicate, Wardens of Magellan, Legion of Midas, and Heralds of Ragnarok. Choose **Base only** to use the original roster. Expanded games let each player choose a unique piece color independently of their faction. Existing saves and rooms retain their original roster and rules version.

The four additions follow the faction sheets and explicit trade amendments in the source Drive. Games still use eight rounds, private reputation, the existing technology market and random exploration/discovery; the collection's full house-rule variant is not enabled. Base factions retain their original trade rates.

## Sound and navigation

Game Settings provides independent dice sounds, game effects, and ambient music controls. New effects and music start off; enable them and adjust their volumes there. Pinch over the galaxy to zoom and use two-finger scrolling to pan. History scrolls within its own panel.

Turn and upkeep notices draw attention when input is needed. Resource exchange is labeled **Convert**; reputation capacity choices remain within diplomacy rather than the main action menu.

## Game recovery and combat guidance

Open **Game menu** to save and return home, quit a solo run, or resign from multiplayer. Resignation permanently hands your civilization to AI; ended participation moves to Past games without inventing a final score.

**Settings → History & undo** lets the room host choose an action and restore the game before it. Every other active human must agree; AI agrees automatically and solo undo is immediate. Voting pauses the game and survives reloads. Undo preserves a visible audit, restores saved randomness and private choices, and cannot cross a resignation. Actions recorded before checkpoint support are unavailable. It cannot erase information players have already seen.

Enable **Show estimated combat odds during movement** in new-game or room setup for optional public-fleet estimates. They are approximate and omit voluntary retreats and future reinforcements. Combat retains manual Roll/Retreat choices and now shows firing ships, impacts and wrecks. Influence selects a destination first; withdrawal is a separate explicit choice. Successful actions show brief saved-result notifications.

## Community faction research and credits

The expanded roster is drawn from **Régis Étienne’s (@retienne) 24-faction collection**, using [his Google Drive files](https://drive.google.com/drive/folders/1pFDgHXE_gsLb2AT3hPptgiSuuM237KHR) as the source of truth. See his [faction overview](https://boardgamegeek.com/thread/3318132/my-24-factions-for-eclipse-second-dawn-for-the-gal), [balance variant](https://boardgamegeek.com/thread/3299146/less-random-and-more-balanced-games-variant), and [sector statistics](https://boardgamegeek.com/filepage/281330/eclipse-all-sectors-statistics-and-probabilities-f). Thanks to Régis and the many original designers, strategy authors, and playtesters who made this collection possible.

The [research index](coding_agents/faction_research/README.md) includes faction abilities and implementation difficulty, AI strategy notes, a file inventory, and [full credits](coding_agents/faction_research/credits.md). The [complete original-file snapshot](https://github.com/a1j9o94/eclipse-rougelike/releases/tag/faction-sources-2026-09-19) is preserved as a GitHub release archive, keeping large artwork and editable templates out of the game bundle.

The underlying Eclipse game is by **Touko Tahkokallio / Lautapelit.fi**. Community sources retain their original credits and notices. Only the four additions listed above are playable; the rest of the archived factions and house rules remain research material.
