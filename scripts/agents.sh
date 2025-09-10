#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/coding_agents/logs"
PID_DIR="$ROOT_DIR/coding_agents/pids"
REAP_LOG="$LOG_DIR/_reap.log"

DEFAULT_CODEX_FLAGS="--dangerously-bypass-approvals-and-sandbox --search -C . -p default"

ensure_dirs() {
  mkdir -p "$LOG_DIR" "$PID_DIR"
}

usage() {
  cat <<USAGE
Usage:
  agents spawn <role> <name> -- <command...>
  agents status
  agents tail <name>
  agents stop <name>
  agents reap
  agents running-count

Notes:
  - Logs: coding_agents/logs/<name>.out
  - PIDs: coding_agents/pids/<name>.pid
  - CODEX_FLAGS default: "${DEFAULT_CODEX_FLAGS}"
USAGE
}

is_alive() {
  local pid="$1"
  if [ -z "$pid" ]; then return 1; fi
  if kill -0 "$pid" >/dev/null 2>&1; then return 0; else return 1; fi
}

cmd_spawn() {
  local role name
  role="${1:-}"
  name="${2:-}"
  if [ -z "$role" ] || [ -z "$name" ]; then
    echo "spawn requires <role> and <name>" >&2; exit 2
  fi
  if [ "${3:-}" != "--" ]; then
    echo "spawn usage: agents spawn <role> <name> -- <command...>" >&2; exit 2
  fi
  shift 3
  ensure_dirs
  local log_file="$LOG_DIR/${name}.out"
  local pid_file="$PID_DIR/${name}.pid"

  # Compose the command. Export CODEX_FLAGS for child processes; callers may choose to use it.
  local user_cmd
  user_cmd="$*"
  local codex_flags
  codex_flags="${CODEX_FLAGS:-$DEFAULT_CODEX_FLAGS}"

  # shellcheck disable=SC2016
  local launcher
  launcher="export CODEX_FLAGS=\"$codex_flags\"; echo [agents:$role:$name] starting at $(date -u +%Y-%m-%dT%H:%M:%SZ); $user_cmd; status=\$?; echo [agents:$role:$name] exit code \$status at $(date -u +%Y-%m-%dT%H:%M:%SZ); exit \$status"

  # Detach: setsid + nohup; ensure CWD is repo root
  (
    cd "$ROOT_DIR"
    if command -v setsid >/dev/null 2>&1; then
      nohup setsid bash -lc "$launcher" >> "$log_file" 2>&1 &
    else
      nohup bash -lc "$launcher" >> "$log_file" 2>&1 &
    fi
    echo $! > "$pid_file"
    echo "spawned $name (role=$role) pid $(cat "$pid_file")"
    echo "log: $log_file"
  )
}

cmd_status() {
  ensure_dirs
  printf "%-28s %-8s %s\n" "NAME" "STATUS" "LOG"
  for f in "$PID_DIR"/*.pid; do
    [ -e "$f" ] || continue
    local name pid status
    name="$(basename "$f" .pid)"
    pid="$(cat "$f" 2>/dev/null || true)"
    if is_alive "$pid"; then status="RUNNING:$pid"; else status="EXITED"; fi
    printf "%-28s %-8s %s\n" "$name" "$status" "$LOG_DIR/${name}.out"
  done
}

cmd_tail() {
  ensure_dirs
  local name="${1:-}"
  if [ -z "$name" ]; then echo "tail requires <name>" >&2; exit 2; fi
  local log_file="$LOG_DIR/${name}.out"
  if [ ! -f "$log_file" ]; then echo "no log for $name at $log_file" >&2; exit 1; fi
  tail -f "$log_file"
}

cmd_stop() {
  ensure_dirs
  local name="${1:-}"
  if [ -z "$name" ]; then echo "stop requires <name>" >&2; exit 2; fi
  local pid_file="$PID_DIR/${name}.pid"
  if [ ! -f "$pid_file" ]; then echo "no pid for $name" >&2; exit 1; fi
  local pid
  pid="$(cat "$pid_file")"
  if ! is_alive "$pid"; then echo "$name already exited"; rm -f "$pid_file"; exit 0; fi
  echo "stopping $name (pid $pid)"
  kill -TERM "$pid" 2>/dev/null || true
  for _ in {1..10}; do
    if ! is_alive "$pid"; then break; fi
    sleep 1
  done
  if is_alive "$pid"; then
    echo "kill -KILL $pid"
    kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
}

cmd_reap() {
  ensure_dirs
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  touch "$REAP_LOG"
  for f in "$PID_DIR"/*.pid; do
    [ -e "$f" ] || continue
    local name pid
    name="$(basename "$f" .pid)"
    pid="$(cat "$f" 2>/dev/null || true)"
    if ! is_alive "$pid"; then
      echo "[$now] reap $name (stale pid $pid)" >> "$REAP_LOG"
      rm -f "$f"
      echo "reaped $name"
    fi
  done
}

cmd_running_count() {
  ensure_dirs
  local cnt=0
  for f in "$PID_DIR"/*.pid; do
    [ -e "$f" ] || continue
    local pid
    pid="$(cat "$f" 2>/dev/null || true)"
    if is_alive "$pid"; then cnt=$((cnt+1)); fi
  done
  echo "$cnt"
}

main() {
  local cmd="${1:-}"; shift || true
  case "$cmd" in
    spawn) cmd_spawn "$@" ;;
    status) cmd_status ;;
    tail) cmd_tail "$@" ;;
    stop) cmd_stop "$@" ;;
    reap) cmd_reap ;;
    running-count) cmd_running_count ;;
    -h|--help|help|"") usage ;;
    *) echo "unknown command: $cmd" >&2; usage; exit 2 ;;
  esac
}

main "$@"

