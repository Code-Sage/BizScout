#!/usr/bin/env bash
# Starts the local development services in Docker, from the repo's docker-compose.yml (project "bizscout"):
#   - postgres  (postgres:17-alpine)        on localhost:55432; DBs bizscout + bizscout_test
#   - httpbin   (mccutchen/go-httpbin:2.25)  on localhost:8080
# Postgres is published on 55432 because a Homebrew Postgres already owns 5432 on this machine.
# Override with BIZSCOUT_PG_PORT.
#
# Idempotent: running it again (or twice at once) is safe. Services that are already up are left alone.
# If Docker Desktop isn't running, it is started. A port taken by something outside Docker produces a
# clear error. Data persists in the Docker volume bizscout_pgdata.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
export POSTGRES_PORT="${BIZSCOUT_PG_PORT:-55432}"
HTTPBIN_PORT=8080   # fixed by docker-compose.yml
cd "$REPO"

docker_ready() { docker info > /dev/null 2>&1; }
wait_for() { local tries="$1"; shift; for _ in $(seq 1 "$tries"); do "$@" && return 0; sleep 1; done; return 1; }
compose() { docker compose "$@"; }
pg_ready() { compose exec -T postgres pg_isready -U bizscout -d bizscout > /dev/null 2>&1; }
pg_host_ready() { nc -z localhost "$POSTGRES_PORT" > /dev/null 2>&1; }
httpbin_healthy() { curl -sf "http://localhost:$HTTPBIN_PORT/get" 2> /dev/null | grep -q '"headers"'; }

# --- Docker engine ---------------------------------------------------------------------------------
if ! docker_ready; then
  echo "docker: engine not running; starting Docker Desktop…"
  open -a Docker 2> /dev/null || { echo "docker: Docker Desktop isn't installed. Install it, then retry." >&2; exit 1; }
  wait_for 120 docker_ready || { echo "docker: the engine didn't start within 2 minutes. Open Docker Desktop, then retry." >&2; exit 1; }
  echo "docker: engine running"
fi

# --- Containers ------------------------------------------------------------------------------------
log="$(mktemp)"
if ! compose up -d --wait > "$log" 2>&1; then
  # A concurrent run may have been creating the same containers; one retry settles it.
  if ! compose up -d --wait > "$log" 2>&1; then
    cat "$log" >&2
    for port in "$POSTGRES_PORT" "$HTTPBIN_PORT"; do
      owner="$(lsof -iTCP:"$port" -sTCP:LISTEN -n -P 2> /dev/null | awk 'NR == 2 { print $1 " (pid " $2 ")" }')"
      [ -n "$owner" ] && echo "hint: port $port is in use by $owner. Stop it or set BIZSCOUT_PG_PORT." >&2
    done
    rm -f "$log"
    exit 1
  fi
fi
rm -f "$log"

wait_for 60 pg_ready || { echo "postgres: container isn't accepting connections; see: docker compose logs postgres" >&2; exit 1; }
wait_for 30 pg_host_ready || { echo "postgres: not reachable on localhost:$POSTGRES_PORT" >&2; exit 1; }

# The init script creates bizscout_test only on a brand-new volume; make sure it exists regardless.
if ! compose exec -T postgres psql -U bizscout -d postgres -tAc \
  "select 1 from pg_database where datname = 'bizscout_test'" | grep -q 1; then
  compose exec -T postgres psql -U bizscout -d postgres -qc 'create database bizscout_test' > /dev/null 2>&1 || true
  echo "postgres: created database bizscout_test"
fi
echo "postgres: running in Docker on localhost:$POSTGRES_PORT (DBs bizscout, bizscout_test)"

wait_for 30 httpbin_healthy || { echo "httpbin: not answering on localhost:$HTTPBIN_PORT; see: docker compose logs httpbin" >&2; exit 1; }
echo "httpbin: running in Docker on localhost:$HTTPBIN_PORT"
