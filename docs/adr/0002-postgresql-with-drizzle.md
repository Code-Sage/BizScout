# 0002 — PostgreSQL with Drizzle ORM

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

We store one record per ping (≈288/day) with a known core (status, latency, size, errors) and an unknown tail (arbitrary request/response JSON). Reads are time-series shaped: newest-first pages, window aggregates (avg, p50/p95/p99), chart series. Scheduling must be idempotent across two triggers. Phase 6 adds one analytics row per ping (joined back for charts) and needs "at most one open alert per kind" enforced by the database.

## Decision

PostgreSQL 17 via Drizzle ORM (SQL-like, TypeScript-first, generated SQL migrations).

## Alternatives considered

- **MongoDB** — flexible documents, but percentiles/time buckets are clumsier, and joining pings to their analytics is less natural than a SQL join.
- **SQLite** — ideal locally, but free hosts don't offer durable disks that survive redeploys.
- **Prisma** — heavier runtime and codegen; Drizzle keeps queries readable as SQL.

## Consequences

- JSONB holds the unknown tail without schema churn; typed columns stay indexable.
- `percentile_cont`, `FILTER`, `date_trunc` and `ON CONFLICT` do the heavy lifting in one round trip.
- We need a managed Postgres in production (Supabase free tier) and TLS config for it.
