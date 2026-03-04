#!/usr/bin/env bash
# Load .env.local and run db:push (avoids npm not inheriting env)
set -e
cd "$(dirname "$0")/.."
# Export all variables from .env.local to child process
set -a
if [ -f .env.local ]; then
  source .env.local
fi
set +a
exec npx tsx scripts/db-push-rbac.ts
