# Durable local Second Dawn startup

Outcome: `npm run second-dawn:local` starts the complete game at http://127.0.0.1:5175 without a cloud login and resumes the same local guest saves after a server or laptop restart.

Acceptance: preserve existing repository configuration and legacy deployment, reuse the durable anonymous backend, start Vite only after functions are ready, and stop both subprocess trees on Ctrl-C. Test first: a fake Convex CLI rewrites `.env.local` and removes `convex.json`; original repository bytes and permissions must remain intact during startup, shutdown and failure.

## Decision

Use an **isolated working directory**, not snapshot-and-restore of the real configuration. Convex 1.26.2 currently writes `.env.local` and migrates `convex.json` in its working directory even with `--env-file`. The CLI therefore runs in ignored `.second-dawn/backend`, whose `convex`, `shared`, and `node_modules` directories link to the real code. Package and TypeScript configuration are copied into that directory. The original project `.env.local` and `convex.json` are never touched, including transiently.

`.second-dawn/convex.env` contains only `CONVEX_DEPLOYMENT=anonymous:anonymous-agent` (or the actual anonymous name written by the CLI). The launcher sets `CONVEX_AGENT_MODE=anonymous`, removes inherited cloud/self-hosted deployment credentials, invokes the installed Convex CLI with the custom environment file, and waits for `Convex functions ready`. Vite runs in the real project with `VITE_CONVEX_URL=http://127.0.0.1:3210` and strict port 5175. Both processes are terminated as process groups on shutdown. Occupied ports are rejected before startup.

The durable database remains under `~/.convex/anonymous-convex-backend-state/anonymous-agent`. The wrapper never reads or prints its admin key. Do not delete that state directory to restart the game. Same-browser guest credentials remain in browser storage; use the same origin (`127.0.0.1:5175`) to resume.

## Implementation and verification

- `tools/second-dawn-local.mjs`, command `npm run second-dawn:local`.
- `tools/second-dawn-local.test.mjs`, command `npm run test:second-dawn:local`.
- `.second-dawn/` ignored by Git.
- TDD: first test run failed with missing implementation. Both preservation tests then passed. They exercise destructive fake-CLI behavior in the isolated cwd, exact original bytes (including CRLF and a NUL), original 0640/0600 file permissions, ready/shutdown and exit-7 failure, anonymous-name persistence, and Vite's local URL.
- Actual installed Convex CLI successfully bundled the symlinked source and started without login; Vite followed readiness.
- Recorded hashes and modes of original `.env.local` and `convex.json` before startup, while running, and after full shutdown/restart; all identical. Hashes retained only in ignored local verification data; no configuration values were printed.
- Created a real guest match and committed an exploration draw. Stopped both backend and Vite via launcher SIGTERM, restarted with the same npm command, reopened a browser context with its stored guest credential, and confirmed the same match ID and exact outstanding exploration decision text. Evidence: `second_dawn_live/local-restart.json`; credentials remain only in ignored `.second-dawn/` with mode 0600.
- Changed launcher/test files are ESLint-clean. Repository-wide lint/build are coordinated by the root agent.

The local process is intentionally left running for the user's playtest. Cross-device recovery remains deferred. No original deployment was reconfigured or seeded.
