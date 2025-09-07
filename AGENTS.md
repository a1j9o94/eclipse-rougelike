Agents — Orchestrator & Sub-Agents

Mission

Ship changes safely and fast. The Supervisor (orchestrator) coordinates Planning, Engine/Implementation, and Tests agents. It keeps CI green (tests/lint/build), spawns focused sub-agents for parallel tasks, and reaps completed work. Everything leaves a paper trail in coding_agents/.


---

Ground Rules (non-negotiable)

TDD: write a failing test → implement → make it pass. Never ship untested behavior.

Hygiene: npm run lint && npm run test:run && npm run build must be green at the end of every loop.

Types: no any/unknown on public boundaries. Define/extend domain types; introduce explicit interfaces for data crossing module boundaries.

Player experience: every change must improve clarity or fun. Document the UX intent in the plan.

Branches: for major work, branch from the parent’s branch. Name: feature/<short-kebab>.

Write it down: plans, decisions, and status updates live under coding_agents/ (see structure below).



---

Directory structure

coding_agents/
  agents.md                     # this file
  planning_agents.md            # plan templates & checklists
  implementation_agents.md      # coding playbooks
  research_agents.md            # research SOPs
  subagents/
    engine_agent.md
    planning_agent.md
    tests_agent.md
  checklists/
    app_slim_phase0b_status.md
    app_slim_refactor_design.md
  logs/                         # runtime logs (*.out)
  pids/                         # pidfiles (*.pid)


---

Startup checklist (every session)

1. Sync & branch



git fetch -p
git switch <working-branch>
git pull --rebase

2. Safety net



npm ci
npm run lint
npm run test:run
npm run build

3. Plan stub
Create/append a plan entry in coding_agents/subagents/planning_agent.md describing:



Intent (user-visible outcome)

Acceptance criteria

Risks & rollback

Test list (failing tests to write first)



---

Supervisor responsibilities

Plan: writes/updates coding_agents/<topic>_plan.md.

Spawn: launches sub-agents for scoped tasks (planning/engine/tests).

Observe: tails logs, tracks PIDs, and reaps finished work.

Gate: only merges changes when tests/lint/build are green and acceptance criteria are met.

Document: updates status docs and design notes as work completes.



---

Sub-agent roles (what each agent does & how to start it)

Planning Agent

Output: coding_agents/<feature>_design.md and a task breakdown.

Must produce acceptance criteria + failing test list.

Start:


agents spawn planning "<feature>-planning" \
  -- cmd="node scripts/agent_planning.js --feature <feature>"

Engine/Implementation Agent

Output: code + new/updated types; no side-effects in reducers.

Must reference implementation_agents.md.

Start:


agents spawn engine "<feature>-engine" \
  -- cmd="node scripts/agent_engine.js --feature <feature>"

Tests Agent

Output: failing tests first, then green.

Owns coverage and regression harnesses.

Start:


agents spawn tests "<feature>-tests" \
  -- cmd="node scripts/agent_tests.js --feature <feature>"

> Implementation detail: agents spawn runs the command fully detached (setsid + nohup) and writes coding_agents/pids/<name>.pid and coding_agents/logs/<name>.out.




---

Orchestrator loop (headless, non-blocking)

Create orchestrator.sh at repo root:

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT="$ROOT/scripts/agents.sh"

# 0) Pre-flight
npm run lint
npm run test:run
npm run build

# 1) Draft/refresh plan (blocking — quick)
node scripts/agent_supervisor_plan.js

# 2) Spawn focused sub-agents (non-blocking)
$AGENT spawn planning "plan-$RANDOM"  -- cmd="node scripts/agent_planning.js"
$AGENT spawn tests    "tests-$RANDOM" -- cmd="node scripts/agent_tests.js"
$AGENT spawn engine   "engine-$RANDOM" -- cmd="node scripts/agent_engine.js"

# 3) Supervisory loop
while true; do
  # Reap finished agents, mark status, and archive logs
  $AGENT reap
  $AGENT status

  # Health gate
  npm run test:run || true

  # Optional: convergence check — break when no agents running
  if [[ "$($AGENT running-count)" -eq 0 ]]; then
    # Final gate before exit
    npm run lint && npm run test:run && npm run build
    break
  fi
  sleep 15
done

Run it headless:

nohup bash orchestrator.sh > coding_agents/logs/orchestrator.out 2>&1 < /dev/null &
echo $! > coding_agents/pids/orchestrator.pid


---

Process manager (scripts/agents.sh)

Create scripts/agents.sh:

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
LOG_DIR="$ROOT/coding_agents/logs"
PID_DIR="$ROOT/coding_agents/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

usage() {
  echo "agents {spawn|stop|status|tail|reap|running-count} ..."
}

# spawn <role> <name> -- cmd="<command string>"
spawn() {
  local role="$1"; shift
  local name="$1"; shift
  [[ "$1" == "--" ]] || { echo "missing --"; exit 2; }
  shift
  local cmd
  cmd="$(printf "%s" "$@" | sed -E 's/^cmd=//')"

  local log="$LOG_DIR/${name}.out"
  local pidf="$PID_DIR/${name}.pid"

  # detach: new session, ignore HUP, no TTY
  setsid nohup bash -lc "$cmd" >"$log" 2>&1 < /dev/null &
  local pid=$!
  echo "$pid" > "$pidf"
  echo "spawned [$role] $name pid=$pid log=$log"
}

stop() {
  local name="$1"
  local pidf="$PID_DIR/${name}.pid"
  [[ -f "$pidf" ]] || { echo "no pidfile for $name"; return 0; }
  local pid
  pid="$(cat "$pidf")"
  if kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" || true
    # escalate after timeout
    for _ in {1..20}; do
      kill -0 "$pid" 2>/dev/null || { rm -f "$pidf"; echo "stopped $name"; return 0; }
      sleep 0.5
    done
    kill -KILL "$pid" || true
  fi
  rm -f "$pidf"
  echo "stopped $name"
}

status() {
  shopt -s nullglob
  for f in "$PID_DIR"/*.pid; do
    local name; name="$(basename "$f" .pid)"
    local pid; pid="$(cat "$f")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "$name RUNNING (pid $pid)  log=$LOG_DIR/$name.out"
    else
      echo "$name EXITED   (stale pid $pid)  log=$LOG_DIR/$name.out"
    fi
  done
}

tail_logs() {
  local name="$1"
  tail -n 200 -f "$LOG_DIR/$name.out"
}

reap() {
  shopt -s nullglob
  for f in "$PID_DIR"/*.pid; do
    local name; name="$(basename "$f" .pid)"
    local pid; pid="$(cat "$f")"
    if ! kill -0 "$pid" 2>/dev/null; then
      # mark completion & archive
      echo "$(date -Iseconds) :: $name finished (pid $pid)" >> "$LOG_DIR/_reap.log"
      rm -f "$f"
    fi
  done
}

running_count() {
  local c=0
  shopt -s nullglob
  for f in "$PID_DIR"/*.pid; do
    local pid; pid="$(cat "$f")"
    kill -0 "$pid" 2>/dev/null && ((c++)) || true
  done
  echo "$c"
}

case "${1:-}" in
  spawn) shift; spawn "$@";;
  stop) shift; stop "$@";;
  status) shift || true; status;;
  tail) shift; tail_logs "$@";;
  reap) shift || true; reap;;
  running-count) shift || true; running_count;;
  *) usage; exit 2;;
esac

Make it available:

chmod +x scripts/agents.sh orchestrator.sh
echo 'alias agents="bash scripts/agents.sh"' >> ~/.bashrc


---

Logging & artifacts

Runtime logs: coding_agents/logs/<agent>.out

Reap events: coding_agents/logs/_reap.log

PID files: coding_agents/pids/<agent>.pid

Plans & design: coding_agents/*.md, coding_agents/subagents/*.md

Every agent must write a brief “Result & Next Steps” footer into its log before exit.



---

Signals & shutdown policy

Graceful stop: TERM (agents should trap and finish the current step).

Hard stop: KILL (used only after 10s grace).

Orchestrator on exit must run the health gate:


npm run lint && npm run test:run && npm run build


---

Concurrency guard

Default max concurrent sub-agents: 3. The orchestrator should check agents running-count and delay spawns if over budget to avoid local CPU thrash.


---

Systemd (optional, if you want auto-restart)

You can run the orchestrator as a user service:

~/.config/systemd/user/coding-orchestrator.service

[Unit]
Description=Coding Orchestrator
After=default.target

[Service]
WorkingDirectory=%h/<your-repo>
ExecStart=/usr/bin/bash orchestrator.sh
Restart=always
RestartSec=5
StandardInput=null
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target

systemctl --user daemon-reload
systemctl --user enable --now coding-orchestrator
journalctl --user -u coding-orchestrator -f


---

Acceptance gates (what “done” means)

All acceptance criteria in the plan satisfied.

Lint/tests/build green.

Player-visible behavior matches intent (or is explicitly flagged in the plan).

Updated docs in coding_agents/:

The plan has a “Decision Log” and “Follow-ups”.

checklists/* updated if architecture changed.




---

Quick command cheatsheet

# Spawn agents
agents spawn planning my-plan -- cmd="node scripts/agent_planning.js --feature app-slim"
agents spawn engine   my-engine -- cmd="node scripts/agent_engine.js --feature app-slim"
agents spawn tests    my-tests -- cmd="node scripts/agent_tests.js --feature app-slim"

# Observe / control
agents status
agents tail my-tests
agents reap
agents stop my-engine
agents running-count


---

Pointers for the Supervisor when writing/reading design docs

When you open or create docs like:

coding_agents/app_slim_refactor_design.md

coding_agents/checklists/app_slim_phase0b_status.md

coding_agents/subagents/*_agent.md


Ensure each doc answers:

1. User outcome in one sentence.


2. Interfaces/types you’re adding or changing.


3. Test inventory with links to files (tests/*.spec.ts), marking which are failing first.


4. Risks/rollback path.


5. Who owns it next (which agent picks it up).