# Carry-forward items

Decisions and fixes that outlive a single phase. `/phase-implement` does the items for its phase first,
`/phase-review` adds new ones, and `/phase-commit` ticks them off. Edit freely.

## Phase 5 (production hardening task) — done

- [x] Add a pg `query_timeout` (e.g. 15 s) so a hung query can't stall the scheduler (`apps/api/src/db/client.ts`).
- [x] (Minor, optional, from Phase 4's review) Keep the local E2E API independent of `apps/api/.env` (e.g. a local `DATABASE_SSL=true` breaks local E2E): skip `.env` loading when `NODE_ENV === 'test'` or set `DATABASE_SSL=false` in the Playwright web-server env. CI is unaffected.
- [x] Drain in-flight work on shutdown: await `server.close()` (bounded by the 10 s timer) and in-flight `runSlot` calls before ending the pool (`apps/api/src/server.ts`). Landed as `close-gracefully.ts` (server.close() plus force-closing idle/reconnected sockets) after the phase-5 review found the naive version could hang or force-exit on a reconnecting SSE client.

## Pending user action (Phase 5 hosted steps)

- [ ] Task 4: create the Supabase project (Session pooler URL), run migrations against it, verify RLS / Data API exposure.
- [ ] Task 5: create the Render service from `render.yaml`; set `DATABASE_URL` and `CORS_ORIGINS`; record the API URL and `INTERNAL_API_TOKEN`.
- [ ] Task 6: import `apps/web` in Vercel (`VITE_API_BASE_URL`, `ENABLE_EXPERIMENTAL_COREPACK=1`); set Render `CORS_ORIGINS` to the Vercel origin(s); browser check.
- [ ] Task 7: cron-job.org POST tick every 5 min with header `x-internal-token`; gap query after ≥ 2 h. (The GitHub Actions backup tick, `keepalive.yml`, was removed 2026-09-28 — cron-job.org is the sole keep-alive source; see the dated note under Completed phases.)
- [ ] Task 8: GitHub variable `WEB_URL`; run the smoke workflow.
- [ ] Task 9: replace placeholder URLs in README/JOURNAL; fill in JOURNAL's hosted-verification and Time lines.

## Phase 6

- [ ] In the replacement `container.ts`, keep `await Promise.all(jobs.map((job) => job.stop()))` (already amended in the plan). `SlotScheduler` has no `drain()`; `stop()` is async and drains in-flight runs. Keep `server.ts`'s `closeGracefully(server, () => container.stop())`: it is not in any plan block, so don't revert it to a bare `server.close()`.
- [ ] New tables must keep `.enableRLS()` (the plan already does this).

## Phase 8

- [ ] Add the `0002_anomaly_detection` row to DATABASE.md's Migrations table (plan amended).
- [ ] Keep DEPLOYMENT.md's env table in step with `env.ts` (Phase 6 adds the anomaly vars).

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
- Known, accepted limitations (parked): NUL bytes in a response body fail the insert; series `limit 5000` truncates newest points only at non-default intervals; bus subscribers' synchronous prefix runs inline; a 2xx non-JSON response counts as ok; replay bursts trigger redundant stats/series refetches; a ping created during first load may appear only after the next event. From Phase 5: HTTP-triggered `runSlot` isn't drained on shutdown; the 10 s force-exit timer can be shorter than a worst-case in-flight ping; `query_timeout` also bounds migration statements; the CORS preview wildcard admits look-alike Vercel project names (harmless, nothing is credentialed); `smoke.yml` interpolates secrets/vars directly in `run:`; retention wiring has no container-level test.

## Completed phases

- Phase 1 foundation, Phase 2 backend monitoring, Phase 3 frontend dashboard — merged into main (main @ 02980dc, 2026-09-24).
- Phase 4 (Testing Strategy, Coverage & CI Pipeline): merged 2026-09-27, branch phase/04-testing-ci. Both "Do first in Phase 4" items (clock-skew "in N seconds" fix, empty-state refresh notice) done and ticked off above.
- Phase 5 (Deployment & Operations): merged 2026-09-28, branch phase/05-deployment. Code done: tsup build, Docker image, CI docker job, wildcard CORS, RLS, retention sweep, graceful shutdown, render.yaml, vercel.json, smoke workflow, DEPLOYMENT.md + ADR-0006. Hosted provisioning (Tasks 4-9) still pending — see "Pending user action (Phase 5 hosted steps)" above.
- Phase 5 follow-up (2026-09-28): removed `.github/workflows/keepalive.yml` (the GitHub Actions backup tick) at the user's request. It duplicated cron-job.org's job — the tick handler is idempotent per 5-minute slot regardless of caller, so the backup only ever produced a redundant no-op HTTP hit, never a duplicate ping or DB row. cron-job.org is now the sole keep-alive source; the GitHub secret `INTERNAL_API_TOKEN` is no longer needed (only `API_URL` remains, for `smoke.yml`). Updated docs/DEPLOYMENT.md, docs/adr/0006-free-tier-hosting.md and docs/JOURNAL.md to match.
