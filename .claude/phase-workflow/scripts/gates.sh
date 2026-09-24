#!/usr/bin/env bash
# Usage: gates.sh [--e2e]
# Runs every quality gate against the Docker services (start-services.sh) and prints a PASS/FAIL line
# per gate. Exit code is non-zero if any gate fails. Gates for packages/scripts that don't exist yet are
# skipped.
set -uo pipefail

export DATABASE_URL_TEST="${DATABASE_URL_TEST:-postgres://bizscout:bizscout@localhost:55432/bizscout_test}"
export HTTPBIN_TEST_URL="${HTTPBIN_TEST_URL:-http://localhost:8080/anything}"
export E2E_DATABASE_URL="${E2E_DATABASE_URL:-postgres://bizscout:bizscout@localhost:55432/bizscout_test}"

# The test gates need the Docker services; fail fast with a clear hint instead of 100 connection errors.
if ! docker compose ps --status running --services 2> /dev/null | grep -q '^postgres$' \
  || ! curl -sf "${HTTPBIN_TEST_URL%/anything}/get" > /dev/null 2>&1; then
  echo "FAIL  services  (Docker services not running: bash .claude/phase-workflow/scripts/start-services.sh)"
  exit 1
fi

failed=0
run() {
  local name="$1"; shift
  if "$@" > "/tmp/bizscout-gate-$name.log" 2>&1; then
    echo "PASS  $name"
  else
    echo "FAIL  $name  (log: /tmp/bizscout-gate-$name.log)"
    failed=1
  fi
}
has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }

run lint pnpm lint
run format pnpm format:check
run typecheck pnpm typecheck
if has_script test:coverage; then
  run tests pnpm test:coverage
else
  run tests pnpm test
fi
[ -d apps/web ] && run web-build pnpm --filter @bizscout/web build
[ -f apps/api/tsup.config.ts ] && run api-build pnpm --filter @bizscout/api build
if [ "${1:-}" = "--e2e" ] && has_script e2e; then
  run e2e pnpm e2e
fi

exit "$failed"
