#!/usr/bin/env bash
# Stops the Docker services started by start-services.sh (compose project "bizscout" only; other
# containers on this machine are untouched). Containers are removed; the database volume is kept, so
# the next start resumes with the same data. Full reset: `docker compose down -v` (deletes the data).
# Safe to run at any time.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO"

if ! docker info > /dev/null 2>&1; then
  echo "docker: engine not running; nothing to stop"
  exit 0
fi

if [ -z "$(docker compose ps -q 2> /dev/null)" ]; then
  echo "services: not running"
  exit 0
fi

docker compose down > /dev/null 2>&1 && echo "services: stopped (postgres data kept in volume bizscout_pgdata)"
