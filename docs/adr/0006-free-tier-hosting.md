# 0006 — Free-tier hosting: Render + Supabase + Vercel

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The brief requires deployment on a free platform. The API needs a long-running process (scheduler, SSE); the SPA is static. The database must persist and be reachable over IPv4 (Render egress). Its **workload shape** matters most: it is touched at least every 5 minutes, around the clock (scheduled ping plus its analytics row, external cron tick, dashboard reads), at about 288 pings/day and ~18 MB/month.

## Decision

Render (Docker web service, free) for the API; Supabase (Session pooler) for Postgres; Vercel for the SPA; cron-job.org (primary) and GitHub Actions (backup) for keep-alive ticks.

## Database: why Supabase and not Neon

Neon is the more "serverless" Postgres and has the nicer developer experience, so this was a close call. It was decided by free-tier economics for this workload shape.

|                        | Supabase Free                                                | Neon Free                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Compute                | Shared always-on instance, not metered by hours              | 100 CU-hours per project per month; scales to zero after 5 min idle (fixed on Free)                                                                                                                          |
| Our 5-minute heartbeat | Fine                                                         | The idle timer is never reached, so it bills as always on: 0.25 CU × ~730 h ≈ 183 CU-hours/month. The allowance runs out after ~400 h (≈ day 16–17), then compute is suspended until the next billing period |
| Storage                | 500 MB                                                       | 0.5 GB                                                                                                                                                                                                       |
| Pausing                | After 7 days of _inactivity_ (our writes prevent it)         | Only scale-to-zero                                                                                                                                                                                           |
| Connectivity           | Direct connection is IPv6-only, so we use the Session pooler | IPv4 direct and pooled                                                                                                                                                                                       |
| Extras                 | Auto-generated REST Data API (locked down with RLS)          | Branch per PR, serverless driver, 6 h history window                                                                                                                                                         |

Staying on Neon past the free allowance means the Launch plan at $0.106/CU-hour: about **$19/month** for the same always-on usage. Prices checked 2026-09-24 on neon.com/pricing and supabase.com/pricing.

The general point: scale-to-zero pays off for bursty workloads with long idle gaps. A monitor with a 5-minute heartbeat is the opposite, so there's never enough idle time to scale down.

## Other alternatives considered

- **Railway / Fly.io**: no longer have a genuinely free tier for always-on services.
- **Render Postgres free**: expires after 30 days.
- **Vercel serverless for the API**: no long-lived process for SSE or an in-process scheduler.

## Consequences

- Cold starts are possible, and the external tick is load-bearing for uptime (hence two independent cron sources).
- Three dashboards to manage, all documented in `docs/DEPLOYMENT.md`.
- The database stays portable: plain Postgres through node-postgres/Drizzle, with no extensions or provider-specific features. Moving to Neon or any other Postgres is a `DATABASE_URL` change plus the provisioning steps.

## Revisit if

- A ~$19/month budget is available and per-PR database branches (e.g. for Vercel previews) become valuable: switch to Neon Launch.
- The ping interval grows to ≥ 15 minutes, so compute can actually scale to zero between pings and Neon Free fits.
- Supabase changes its free-tier compute or pausing rules.
