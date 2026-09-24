# 0005 — Frontend state: TanStack Query as the single source of server truth

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

The dashboard shows server data from two channels: REST (history, stats, series, detail) and SSE (new pings). Both must converge on one consistent view with pagination, filters, loading/error states and no duplicates.

## Decision

- **TanStack Query** caches all server state. SSE events are _written into the same cache_ (`applyPingToCache`: sorted insert into the first page of every matching filter, dedupe by id) and stats/series are invalidated so they refetch.
- **Zustand** holds client-only UI state that isn't server data: the live-connection status.
- Local component state (`useState`) for view choices: filter, time window, selected ping.
- All responses are validated with the shared zod schemas in `apiGet`.

## Alternatives considered

- **Redux Toolkit / RTK Query** — capable, more boilerplate for the same result.
- **Separate "live" array merged at render** — two sources of truth, harder pagination and dedupe.
- **Refetch on every event** — simpler but wasteful and flickery.

## Consequences

- Components never know whether a row came from REST or SSE.
- Reconnect handling is centralised in `useLiveStream` (server replay + list refetch).
- Test harness uses happy-dom because jsdom's AbortSignal is incompatible with Node's fetch under MSW.
