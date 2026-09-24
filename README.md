# BizScout HTTP Monitor

Pings `httpbin.org/anything` every five minutes with a random JSON payload, stores every response in Postgres, and streams results live to a React dashboard. Option A adds anomaly detection: rolling statistics, z-score detection, a response-time forecast with a confidence band, and alerts.

> Status: 🚧 under construction — see `docs/JOURNAL.md` for progress.

## Quick start (local)

Prerequisites: Node 24, pnpm 11, Docker.

```bash
pnpm install
docker compose up -d --wait
cp apps/api/.env.example apps/api/.env
pnpm --filter @bizscout/api dev
```

If something already listens on 5432 (e.g. a Homebrew Postgres), either stop it or run
`POSTGRES_PORT=55432 docker compose up -d --wait` and point `DATABASE_URL` / `DATABASE_URL_TEST`
at port 55432 instead.

## Documentation

| Doc                    | What's inside                                   |
| ---------------------- | ----------------------------------------------- |
| `docs/REQUIREMENTS.md` | The brief paraphrased with requirement IDs      |
| `docs/DATABASE.md`     | Database schema, entity diagram, indexing       |
| `docs/adr/`            | Architecture decision records                   |
| `docs/JOURNAL.md`      | Build journal: decisions, surprises, time spent |

## API (backend)

| Method | Path                                     | Purpose                                                     |
| ------ | ---------------------------------------- | ----------------------------------------------------------- |
| GET    | `/api/health`                            | Liveness + DB/scheduler status (503 when DB is down)        |
| GET    | `/api/pings?limit&cursor&status&from&to` | History, newest first, keyset pagination                    |
| GET    | `/api/pings/:id`                         | Full record incl. request payload and response body         |
| GET    | `/api/pings/stats?window=1h\|24h\|7d`    | Counts, success rate, avg/p50/p95/p99/min/max               |
| GET    | `/api/pings/series?window=…`             | Chart points                                                |
| GET    | `/api/stream`                            | SSE: `ping.created` (supports `Last-Event-ID` replay)       |
| POST   | `/api/internal/tick`                     | Idempotent slot ping for external cron (`x-internal-token`) |
| POST   | `/api/internal/ping-now`                 | Manual ping (`x-internal-token`)                            |
