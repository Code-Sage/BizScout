#!/usr/bin/env bash
# Stops dev servers, watchers and test runners started from this repo (tsx, vite, vitest, playwright),
# e.g. an API dev server left behind by an agent. It matches only processes whose command line contains
# this repo's path, so it never touches other projects, the Docker services, or Claude Code itself.
# Safe to run at any time; prints what it stopped.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
# The second branch covers the /phase-plan scratch repo under .superpowers/phase-plan/.
pattern="$REPO/((apps|e2e|packages|node_modules)/.*(tsx|vite|vitest|playwright)|\.superpowers/.*(node|tsx|vite|vitest|playwright))"

pids="$(pgrep -f "$pattern" || true)"
if [ -z "$pids" ]; then
  echo "dev processes: none running"
  exit 0
fi

echo "dev processes: stopping"
for pid in $pids; do ps -o pid=,command= -p "$pid" 2> /dev/null | cut -c1-160; done
kill $pids 2> /dev/null || true

for _ in $(seq 1 20); do
  [ -z "$(pgrep -f "$pattern" || true)" ] && break
  sleep 0.25
done
remaining="$(pgrep -f "$pattern" || true)"
if [ -n "$remaining" ]; then
  kill -9 $remaining 2> /dev/null || true
  echo "dev processes: force-stopped $remaining"
fi
echo "dev processes: done"
