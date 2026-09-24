# 0004 — Wall-clock aligned slots with idempotent triggers

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

"Ping every 5 minutes" on a free host: Render's free web service sleeps after 15 idle minutes and restarts on deploys, and an in-process timer dies with it.

## Decision

- Time is divided into aligned slots (`floor(now / 5min)`). A ping belongs to a slot; `ping_results.slot_start` is unique.
- Two triggers call the same `PingService.runSlot(slot)`: the in-process `SlotScheduler` (fires at :00, :05, … and runs a catch-up for the current slot on boot) and `POST /api/internal/tick` from an external cron (which also keeps the dyno awake).
- Idempotency layers: in-memory in-flight set (same process) + unique index with `ON CONFLICT DO NOTHING` (any process).
- No retries on a failed probe: a failure is data.

## Alternatives considered

- **BullMQ + Redis** — robust, but another service to host for a single periodic job.
- **node-cron only** — misses slots while the dyno sleeps.
- **External cron only** — works, but loses pings whenever the cron provider hiccups; two triggers are cheap insurance.

## Consequences

- Gaps are detectable with one SQL query (Phase 5) and never double-counted.
- Worst case a probe is sent twice for one slot (both triggers racing across processes); only one is stored.
