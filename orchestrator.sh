#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_SH="$ROOT_DIR/scripts/agents.sh"

DEFAULT_CODEX_FLAGS="--dangerously-bypass-approvals-and-sandbox --search -C . -p default"
export CODEX_FLAGS="${CODEX_FLAGS:-$DEFAULT_CODEX_FLAGS}"

echo "[orchestrator] Pre-flight gate: lint, test, build"
npm run lint
npm run test:run
npm run build

ts=$(date +%H%M%S)
plan_id="planning-${ts}"
tests_id="tests-${ts}"
engine_id="engine-${ts}"

echo "[orchestrator] Spawning sub-agents (planning/tests/engine)"
bash "$AGENTS_SH" spawn planning "$plan_id" -- codex $CODEX_FLAGS exec "$(cat coding_agents/prompts/planning.md)"
bash "$AGENTS_SH" spawn tests    "$tests_id" -- codex $CODEX_FLAGS exec "$(cat coding_agents/prompts/tests.md)"
bash "$AGENTS_SH" spawn engine   "$engine_id" -- codex $CODEX_FLAGS exec "$(cat coding_agents/prompts/engine.md)"

echo "[orchestrator] Entering reap/status loop"
while :; do
  running=$(bash "$AGENTS_SH" running-count)
  echo "[orchestrator] running agents: $running"
  if [ "$running" -eq 0 ]; then break; fi
  bash "$AGENTS_SH" reap || true
  bash "$AGENTS_SH" status || true
  npm run test:run || true
  sleep 5
done

echo "[orchestrator] Final gate: lint, test, build"
npm run lint
npm run test:run
npm run build

echo "[orchestrator] Done"

