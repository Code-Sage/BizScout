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

## Documentation

| Doc                    | What's inside                                   |
| ---------------------- | ----------------------------------------------- |
| `docs/REQUIREMENTS.md` | The brief paraphrased with requirement IDs      |
| `docs/adr/`            | Architecture decision records                   |
| `docs/JOURNAL.md`      | Build journal: decisions, surprises, time spent |
