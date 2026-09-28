# Build journal

A running log of what was built, the decisions behind it, surprises, and time spent. Newest entries at the bottom.

## Phase 1 — Foundation (2026-09-24)

- Built: pnpm monorepo, lint/format/typecheck gates, shared zod contracts, Express skeleton with validated env + pino + error envelope, docker compose (Postgres 17 + go-httpbin), CI skeleton.
- Decisions: see ADR-0001. go-httpbin gives CI a deterministic, offline stand-in for httpbin.org.
- Surprises: pnpm 11 fails installs on unapproved postinstall scripts → `allowBuilds` in `pnpm-workspace.yaml`. Docker is not installed on the build machine, so the compose stack and CI were written but not run. A Prettier run briefly reformatted the planning docs, now excluded via `.prettierignore`.
- Verification: ran — lint, format:check, typecheck, 12 shared + 12 API tests, API health check against a local Postgres 17 stand-in on port 55432 and an httpbin stub on 8080. Not run — `docker compose up`, GitHub Actions.
- Time: ~35 min (agent-executed)

## Phase 2 — Backend monitoring core

- Built: schema + migrations, payload generator, probe client, repository, event bus, ping service, aligned scheduler, SSE hub with replay, REST history/stats/series, internal tick, composition root.
- Decisions: ADR-0002 (Postgres), ADR-0003 (SSE), ADR-0004 (aligned slots + idempotency). No probe retries: failures are the signal.
- Core component for T6: the monitoring pipeline (payload → probe → persist → publish → deliver). Tests: unit (generator, client, mapper, bus, service, slots, scheduler, hub) + integration (repository, routes, stream, internal, live pipeline).
- Verification: integration tests and the live pipeline test ran against a local Postgres 17 stand-in (port 55432) and an httpbin-compatible stub (port 8080) because Docker isn't installed on the build machine.
- Deviations from plan: non-2xx responses are classified HTTP_ERROR before JSON parsing; payloadEvent is only a string when the payload's event is a string; the scheduler resets its slot memory on stop(); server.ts exits 1 when the port can't be bound.
- Time: ~2 h (agent-executed)

## Phase 3 — Frontend dashboard

- Built: Vite/React app, typed API client, TanStack Query hooks, SSE → cache merge, live indicator, table with pagination + live highlights, stat cards, chart, detail drawer, error boundary.
- Decisions: ADR-0005. happy-dom over jsdom (AbortSignal incompatibility with Node fetch under MSW).
- Verification: component/hook tests (63) passed; a browser check against the local API confirmed the live row insert without reload, the detail drawer (Escape closes), the 375 px layout without horizontal scroll, and reconnect ("Reconnecting…" → "Live").
- Deviations from plan: SegmentedControl implements the full radio-group keyboard pattern (roving tabindex, arrow/Home/End keys); an abort-passthrough test was added for the API client.
- Time: ~1.5 h (agent-executed)

## Phase 4 — Testing & CI

- Built: coverage thresholds (monitoring ≥ 95% lines), coverage summaries + PR comments, Playwright E2E (desktop + mobile), full CI with Postgres and go-httpbin service containers.
- Decisions: E2E runs against the production web build; the scheduler is disabled in E2E for determinism.
- Also fixed (from the Phase 3 review): the "Last ping" card no longer reads "in N seconds" between clock ticks or when the API's clock runs ahead of the browser's; the table and chart show a refresh-failed notice above their empty states.
- Verification: API 110 tests and web 85 tests pass with the coverage thresholds enforced (API 96% lines, monitoring core 98%; web 97%); Playwright 6/6 (3 flows × desktop + Pixel 7). The workflow file passes `@action-validator/cli`; its first GitHub run happens when the branch is pushed.
- Deviations from plan: none.
- Time: ~45 min (agent-executed)

## Phase 5 — Deployment

- Built: tsup bundle, non-root Docker image, Render blueprint (deploy on green CI), Supabase with RLS, Vercel SPA, cron keep-alive, retention sweep, smoke script.
- Decisions: ADR-0006. Session pooler for IPv4. Migrations on boot (no pre-deploy hook on free tier).
- Also fixed (from the Phase 4 review): a 15 s pg `query_timeout` so a hung query can't stall the scheduler; the API no longer loads `apps/api/.env` under `NODE_ENV=test`, so local E2E ignores developer settings; shutdown drains in-flight scheduled runs before ending the pool, then closes leftover keep-alive connections so an open dashboard no longer delays (or, on reconnect, blocks) the exit.
- Verification (local): API tests and gates green; the bundle runs in production mode; the Docker image builds (190 MB), runs as `node` and passes the health check; `scripts/smoke.sh` 5/5 against local servers.
- Verification (hosted): _pending the deploy_ — gap query over ≥ 2 hours and the production smoke run.
- Deviations from plan: `.dockerignore` sits at the repo root (the build context) rather than in `apps/api/`; the schedulers' `stop()` is async and awaited, so shutdown waits for in-flight runs.
- Follow-up (2026-09-28): removed the GitHub Actions backup tick (`keepalive.yml`) at the user's request. cron-job.org is now the sole keep-alive source; see ADR-0006's 2026-09-28 update for why the backup added risk (a silent GitHub 60-day pause) without real redundancy value (`/api/internal/tick` is idempotent per slot, so the backup only ever produced a redundant no-op hit).
- Follow-up (2026-09-28): the response-time chart's hover tooltip is now a custom card (`ResponseTimeTooltip.tsx`): the date and an "Epoch (ms)" line (the raw timestamp; the chart-point property is now `epochMs`) in slate grey, then a green tick or red cross with "Response time" and its value in the matching colour, in the dashboard's usual units ("200 ms", "1.24 s"). The redundant "Failed" row is gone; failures are still drawn as red markers on the chart.
- Time: _fill in_
