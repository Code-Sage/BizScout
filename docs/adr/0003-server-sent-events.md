# 0003 — Server-Sent Events for real-time delivery

- **Status:** Accepted
- **Date:** 2026-09-24

## Context

Clients only need to _receive_ new pings (and later per-ping analytics and alerts). Traffic is tiny (one event per 5 minutes plus occasional others). The API runs behind Render's HTTP proxy.

## Decision

`GET /api/stream` (SSE). Each ping event carries `id: <ping id>`; on reconnect the browser sends `Last-Event-ID` and the server replays missed pings (max 100). Heartbeat comments every 25 s keep idle proxies from closing the stream. An in-process `EventBus` feeds the `SseHub`.

## Alternatives considered

- **WebSocket / Socket.IO** — bidirectional channel we don't need; extra dependency; replay would be hand-built.
- **Polling** — simple but either laggy or wasteful, and not "real-time".

## Consequences

- Native `EventSource` handles reconnection; replay makes brief disconnects lossless.
- One instance only: the bus is in-memory. Scaling out means swapping the bus for Postgres `LISTEN/NOTIFY` (future improvement) without touching publishers or the hub.
- Event types are zod schemas in `packages/shared`, so adding the analytics and alert events (Phase 6) is a contract change, not a protocol change.
