#!/usr/bin/env bash
# Free the dev server port (default 3005) when EADDRINUSE blocks a second `npm run dev`.
# macOS/Linux: uses lsof. Safe if nothing is listening.
set -euo pipefail
PORT="${1:-3005}"
PIDS="$(lsof -ti ":${PORT}" 2>/dev/null || true)"
if [[ -z "${PIDS}" ]]; then
  echo "[dev-free-port] Port ${PORT} is already free."
  exit 0
fi
echo "[dev-free-port] Stopping process(es) on port ${PORT}: ${PIDS}"
kill -9 ${PIDS} 2>/dev/null || true
echo "[dev-free-port] Done. You can run: npm run dev"
