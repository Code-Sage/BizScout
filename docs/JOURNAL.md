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
