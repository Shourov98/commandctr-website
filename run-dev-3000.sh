#!/usr/bin/env bash
set -euo pipefail

PORT=3000
HOST=127.0.0.1
MAX_ATTEMPTS=5

echo "Checking for existing process on ${HOST}:${PORT}..."

get_pids() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:${PORT} || true
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser "${PORT}/tcp" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' || true
    return
  fi

  echo "Neither lsof nor fuser is available. Cannot free port ${PORT} automatically."
  exit 1
}

for attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
  PIDS="$(get_pids | sort -u | tr '\n' ' ' | xargs || true)"
  if [ -z "${PIDS}" ]; then
    echo "Port ${PORT} is free."
    break
  fi

  echo "Attempt ${attempt}/${MAX_ATTEMPTS}: killing process(es) on ${PORT}: ${PIDS}"
  kill -9 ${PIDS} 2>/dev/null || true
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  fi
  sleep 1
done

if [ -n "$(get_pids | xargs || true)" ]; then
  echo "Port ${PORT} is still in use after ${MAX_ATTEMPTS} attempts."
  echo "Another service may be auto-restarting. Stop it, then run this script again."
  exit 1
fi

echo "Starting dev server on ${HOST}:${PORT}..."
pnpm run dev:raw
