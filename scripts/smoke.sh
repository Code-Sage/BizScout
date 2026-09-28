#!/usr/bin/env bash
# Usage: scripts/smoke.sh https://bizscout-monitor-api.onrender.com https://biz-scout-web.vercel.app
set -euo pipefail

API="${1:?usage: smoke.sh https://bizscout-monitor-api.onrender.com https://biz-scout-web.vercel.app}"
WEB="${2:-}"
fail() { echo "✗ $1" >&2; exit 1; }
pass() { echo "✓ $1"; }

health=$(curl --fail --silent --max-time 90 "$API/api/health") || fail "health endpoint unreachable"
grep -q '"status":"ok"' <<<"$health" || fail "health not ok: $health"
grep -q '"database":"up"' <<<"$health" || fail "database down: $health"
pass "health ok"

pings=$(curl --fail --silent --max-time 30 "$API/api/pings?limit=1") || fail "pings endpoint failed"
grep -q '"data":\[{' <<<"$pings" || fail "no pings recorded yet: $pings"
pass "history has data"

stats=$(curl --fail --silent --max-time 30 "$API/api/pings/stats?window=24h") || fail "stats failed"
grep -q '"total":' <<<"$stats" || fail "unexpected stats: $stats"
pass "stats ok"

stream=$(curl --silent --no-buffer --max-time 5 "$API/api/stream" || true)
grep -q '^retry: 5000' <<<"$stream" || fail "SSE stream did not open"
pass "sse stream opens"

if [[ -n "$WEB" ]]; then
  page=$(curl --fail --silent --max-time 30 "$WEB") || fail "web unreachable"
  grep -q '<title>BizScout Uptime Monitor</title>' <<<"$page" || fail "unexpected web page"
  pass "web serves the dashboard"
fi
