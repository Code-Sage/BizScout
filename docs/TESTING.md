# Testing strategy

## What counts as "core" and why

| Component                                                                 | Why it's core                                      | Risk if it breaks                                                                 | Test depth                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Monitoring pipeline** (scheduler → payload → probe → persist → publish) | It _is_ the product: without it there's no data    | Silent data gaps, duplicate or misclassified pings                                | **Comprehensive** (this is the T6 component)            |
| History REST API                                                          | Only read path for the dashboard and for reviewers | Wrong pages or stats → wrong conclusions                                          | Integration tests on every endpoint                     |
| Real-time delivery (SSE)                                                  | The "real-time" requirement                        | Stale dashboard, missed events after reconnect                                    | Hub unit tests + stream integration tests + E2E         |
| Dashboard live table                                                      | What users actually see                            | Duplicates, wrong order, broken states                                            | Component + hook tests + E2E                            |
| Anomaly engine & alerting (Phase 6)                                       | Every alert and chart annotation depends on it     | Alert fatigue from false alarms, missed slowdowns, wrong statistics shown as fact | Seeded statistical tests + backtest + integration tests |

**Why the monitoring pipeline gets the deepest tests:** every other feature is downstream of it. A bug there corrupts history, stats, anomaly scores and alerts at once, and failures are silent (nothing crashes; data is just wrong or missing). It is also where the subtle logic lives: slot alignment, idempotency across two triggers, failure classification and timing.

## The pyramid

| Layer         | Tooling                                               | Where                                                                   | What it proves                                                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit          | Vitest, fake timers, seeded RNG, MSW, in-memory fakes | `apps/api/test/unit`, `apps/web/src/**/*.test.ts(x)`, `packages/shared` | Business rules in isolation: payload shape, probe classification (timeout / network / HTTP / invalid JSON), slot math, scheduler alignment and resilience, service idempotency, bus isolation, SSE framing, cache merge, formatting |
| Integration   | Vitest + real Postgres + Supertest + real HTTP server | `apps/api/test/integration`                                             | SQL is right (pagination, filters, percentiles, ON CONFLICT), endpoints validate and shape responses, SSE replay works over a real socket, internal auth                                                                            |
| Live pipeline | Vitest + go-httpbin                                   | `apps/api/test/integration/pipeline.test.ts`                            | The real client + real DB + real echo server: the payload we send is the payload httpbin echoes and we store                                                                                                                        |
| Component     | Testing Library + MSW + happy-dom                     | `apps/web/src/**`                                                       | Loading / empty / error states, retry, pagination, live highlight, dialog a11y, chart tooltip (status icon and colour, units)                                                                                                       |
| End-to-end    | Playwright (desktop + Pixel 7)                        | `e2e/tests`                                                             | A user sees history, a new ping appears **without reload**, details open, the layout adapts                                                                                                                                         |

### Monitoring pipeline test inventory (T6)

- `payload-generator.test.ts`: schema conformance over 500 seeded samples, determinism, uniqueness, optional-section frequency, JSON round-trip.
- `httpbin-client.test.ts`: success + timing, byte size, HTTP 5xx, invalid JSON, timeout, network error, no-throw contract.
- `ping-service.test.ts`: full record, event publication, failure recording, skip recorded slot, in-flight guard, concurrent distinct slots, lost insert race, storage failure + lock release, manual pings.
- `slots.test.ts` / `scheduler.test.ts`: boundary math, exact alignment, cadence, catch-up on start, failure resilience, stop (waits for in-flight runs, including an overlapping catch-up), idempotent start.
- `ping-repository.test.ts`: insert/idempotency, NULL-slot manual pings, lookups, keyset pagination, filters, replay order, percentiles, empty windows, series, retention delete.
- `internal.routes.test.ts`, `stream.routes.test.ts`, `pipeline.test.ts`: the pipeline's HTTP entry points and exits.

## Determinism rules

- No real network in unit tests (MSW). No httpbin.org in CI (go-httpbin container).
- Time is injected (`now`) or faked (`vi.useFakeTimers`). Randomness is seeded (`createSeededRng`).
- Integration files run in a single fork and `TRUNCATE` before each test.
- E2E disables the scheduler and creates pings explicitly.

## Coverage gates

| Scope                            | Lines  | Branches | Functions |
| -------------------------------- | ------ | -------- | --------- |
| API overall                      | 85     | 80       | 80        |
| API `src/monitoring/**`          | **95** | **85**   | **95**    |
| API `src/analytics/**` (Phase 6) | **95** | **85**   | **95**    |
| Web overall                      | 85     | 80       | 75        |

Reports: job summary tables on every CI run, PR comments on pull requests, HTML artifacts (`coverage-api`, `coverage-web`).

## Running tests

```bash
docker compose up -d --wait                                   # Postgres + go-httpbin
pnpm test                                                     # shared + api (unit+integration) + web
HTTPBIN_TEST_URL=http://localhost:8080/anything pnpm --filter @bizscout/api test   # incl. live pipeline
pnpm test:coverage                                            # api + web, with thresholds
pnpm --filter @bizscout/e2e exec playwright install chromium  # once, before the first E2E run
pnpm e2e                                                      # Playwright (starts API + web itself)
pnpm --filter @bizscout/api test:unit ping-service            # one file (no `--` before the filter)
```

E2E starts the API on port 4100 (against `bizscout_test`) and a production build of the web app on
port 4173. Locally it reuses a server that is already listening on either port, so stop stale
ones first. If Postgres or go-httpbin don't run on the default ports, point E2E at them with
`E2E_DATABASE_URL` and `E2E_HTTPBIN_URL` (for example
`E2E_DATABASE_URL=postgres://bizscout:bizscout@localhost:55432/bizscout_test pnpm e2e`).

## Deliberately not tested (and why)

- Pixel-perfect chart rendering: Recharts internals; we test the data transform, the states and the tooltip card (rendered on its own, since happy-dom gives the chart no size to hover over) instead.
- Real httpbin.org availability: out of our control. It's monitored, not tested.
- Load/performance: 288 pings/day; not a meaningful risk at this scale (see Future improvements).
