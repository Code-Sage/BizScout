# Carry-forward items

Decisions and fixes that outlive a single phase. `/phase-implement` does the items for its phase first,
`/phase-review` adds new ones, and `/phase-commit` ticks them off. Edit freely.

## Phase 5 (production hardening task)

- [ ] Add a pg `query_timeout` (e.g. 15 s) so a hung query can't stall the scheduler (`apps/api/src/db/client.ts`).
- [ ] (Minor, optional, from Phase 4's review) Keep the local E2E API independent of `apps/api/.env` (e.g. a local `DATABASE_SSL=true` breaks local E2E): skip `.env` loading when `NODE_ENV === 'test'` or set `DATABASE_SSL=false` in the Playwright web-server env. CI is unaffected.
- [ ] Drain in-flight work on shutdown: await `server.close()` (bounded by the 10 s timer) and in-flight `runSlot` calls before ending the pool (`apps/api/src/server.ts`).

## Before Phase 7 runs

- [ ] Phase 7's replacement `use-live-stream.ts` must keep reconnect-with-backoff after a fatal EventSource error (5 s doubling to 60 s, reset on open, `hasOpened` across connections) and invalidate `pingKeys.all` on reconnect. `AlertsPanel` and `DetectionPanel` must show the full `ErrorState` only when there is no cached data, and a compact `RefreshError` otherwise (including above empty states). `AnomalyChart` in the Phase 7 plan (Task 3) was already amended by the Phase 4 review. Otherwise Phase 7 reverts Phase 3/4's fixes.

## Pending user action (Phase 4 Task 3, steps 3–4)

- [ ] Push the branch, open the PR, confirm the four CI checks (quality, api, web, e2e), the two coverage PR comments and the job-summary tables.
- [ ] With your go-ahead, apply branch protection on `main` requiring the four new checks; drop any old "Unit tests" required check.

## Standing decisions

- Commit trailers name the model(s) that authored the work (e.g. `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), not a uniform single model.
- `docs/superpowers/` stays git-ignored until Phase 8, which commits the plans deliberately.
- Local services always run in Docker (compose project `bizscout`; Postgres on localhost:55432 because Homebrew Postgres owns 5432; go-httpbin on 8080). Phases 1–3 were verified against native stand-ins before this switch, and the Docker files (compose, and later the Dockerfile) are now exercised for real.
- Phase 5 hosted provisioning and Phase 8 submission (push, visibility, reviewer invites, email) are user actions.
- Known, accepted limitations (parked): NUL bytes in a response body fail the insert; series `limit 5000` truncates newest points only at non-default intervals; bus subscribers' synchronous prefix runs inline; a 2xx non-JSON response counts as ok; replay bursts trigger redundant stats/series refetches; a ping created during first load may appear only after the next event.

## Completed phases

- Phase 1 foundation, Phase 2 backend monitoring, Phase 3 frontend dashboard — merged into main (main @ 02980dc, 2026-09-24).
- Phase 4 (Testing Strategy, Coverage & CI Pipeline): merged 2026-09-27, branch phase/04-testing-ci. Both "Do first in Phase 4" items (clock-skew "in N seconds" fix, empty-state refresh notice) done and ticked off above.
