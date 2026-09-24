# Carry-forward items

Decisions and fixes that outlive a single phase. `/phase-implement` does the items for its phase first,
`/phase-review` adds new ones, and `/phase-commit` ticks them off. Edit freely.

## Do first in Phase 4

- [ ] **"Last ping … in N seconds" (Important, from Phase 3's final review).** `apps/web/src/features/pings/components/LastPingCard.tsx` computes `formatRelative(lastPingAt, now)` with `now` from `useNow` (15 s tick), so after a live ping `lastPingAt` can be ahead of `now` and the card reads "in N seconds" for up to 15 s. Fix: use `Math.max(now, Date.now())` (or re-read `Date.now()` during render, keeping `useNow` only as the re-render trigger). Test: render, change `lastPingAt` to a time after the last tick, assert "… ago" wording.
- [ ] (Minor, optional) When the cached list/series is empty and a refresh fails, the empty state shows without any notice (`PingTable.tsx`, `ResponseTimeChart.tsx`: check `isError` before the empty-state branch when there's no data to show).

## Phase 5 (production hardening task)

- [ ] Add a pg `query_timeout` (e.g. 15 s) so a hung query can't stall the scheduler (`apps/api/src/db/client.ts`).
- [ ] Drain in-flight work on shutdown: await `server.close()` (bounded by the 10 s timer) and in-flight `runSlot` calls before ending the pool (`apps/api/src/server.ts`).

## Before Phase 7 runs

- [ ] Amend `docs/superpowers/plans/2026-09-24-bizscout-07-anomaly-detection-frontend.md`: its replacement `use-live-stream.ts` must keep reconnect-with-backoff after a fatal EventSource error (5 s doubling to 60 s, reset on open, `hasOpened` across connections) and invalidate `pingKeys.all` on reconnect; its new components (AnomalyChart, AlertsPanel, DetectionPanel) must show the full `ErrorState` only when there is no cached data and a compact refresh alert otherwise. Otherwise Phase 7 reverts Phase 3's fixes.

## Standing decisions

- Commit trailers name the model(s) that authored the work (e.g. `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), not a uniform single model.
- `docs/superpowers/` stays git-ignored until Phase 8, which commits the plans deliberately.
- Local services always run in Docker (compose project `bizscout`; Postgres on localhost:55432 because Homebrew Postgres owns 5432; go-httpbin on 8080). Phases 1–3 were verified against native stand-ins before this switch, and the Docker files (compose, and later the Dockerfile) are now exercised for real.
- Phase 5 hosted provisioning and Phase 8 submission (push, visibility, reviewer invites, email) are user actions.
- Known, accepted limitations (parked): NUL bytes in a response body fail the insert; series `limit 5000` truncates newest points only at non-default intervals; bus subscribers' synchronous prefix runs inline; a 2xx non-JSON response counts as ok; replay bursts trigger redundant stats/series refetches; a ping created during first load may appear only after the next event.

## Completed phases

- Phase 1 foundation, Phase 2 backend monitoring, Phase 3 frontend dashboard — merged into main (main @ 02980dc, 2026-09-24).
