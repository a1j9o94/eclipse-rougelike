#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: $0 <PROMPT_FILE> [extra codex args...]" >&2
  exit 2
fi
PROMPT_FILE="$1"; shift || true
if [ ! -f "$PROMPT_FILE" ]; then
  echo "Prompt file not found: $PROMPT_FILE" >&2
  exit 2
fi
PROMPT_CONTENT="$(cat "$PROMPT_FILE")"
exec codex exec "$PROMPT_CONTENT" "$@"

