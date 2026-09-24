import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/http/app';
import { createLogger } from '../../../src/lib/logger';
import { summarizeRow, toPingResult } from '../../../src/monitoring/ping-mapper';
import { PingRepository } from '../../../src/monitoring/ping-repository';
import { SseHub } from '../../../src/realtime/sse-hub';
import { toSseMessage } from '../../../src/realtime/server-events';
import { buildAppDeps } from '../../support/app';
import { createTestDatabase, resetDatabase } from '../../support/db';
import { buildPingRow } from '../../support/factories';
import { collectSseEvents } from '../../support/sse';

const handle = createTestDatabase();
const repo = new PingRepository(handle.db);
const hub = new SseHub(createLogger({ level: 'silent', pretty: false }));
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp(buildAppDeps({ pings: repo, hub })).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => resetDatabase(handle));
afterAll(async () => {
  hub.stop();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await handle.pool.end();
});

describe('GET /api/stream', () => {
  it('responds with SSE headers', async () => {
    const row = (await repo.insert(buildPingRow()))!;
    const ping = toPingResult(summarizeRow(row));
    const { headers } = await collectSseEvents(`${baseUrl}/api/stream`, {
      count: 1,
      onOpen: () => hub.broadcast(toSseMessage('ping.created', ping, ping.id)),
    });
    expect(headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(headers.get('cache-control')).toBe('no-cache, no-transform');
  });

  it('delivers broadcast pings to connected clients', async () => {
    const row = (await repo.insert(buildPingRow()))!;
    const ping = toPingResult(summarizeRow(row));

    const { events } = await collectSseEvents(`${baseUrl}/api/stream`, {
      count: 1,
      onOpen: () => hub.broadcast(toSseMessage('ping.created', ping, ping.id)),
    });

    expect(events).toEqual([{ event: 'ping.created', id: String(ping.id), data: ping }]);
  });

  it('replays pings missed since Last-Event-ID, oldest first', async () => {
    const first = (await repo.insert(buildPingRow()))!;
    await repo.insert(buildPingRow({ requestPayload: { event: 'offer.submitted' } }));
    await repo.insert(buildPingRow({ requestPayload: { event: 'message.sent' } }));

    const { events } = await collectSseEvents(`${baseUrl}/api/stream`, {
      count: 2,
      headers: { 'last-event-id': String(first.id) },
    });

    expect(events.map((event) => event.id)).toEqual(['2', '3']);
    expect(events.map((event) => (event.data as { payloadEvent: string }).payloadEvent)).toEqual([
      'offer.submitted',
      'message.sent',
    ]);
  });

  it('forgets clients that disconnect', async () => {
    const row = (await repo.insert(buildPingRow()))!;
    const ping = toPingResult(summarizeRow(row));
    await collectSseEvents(`${baseUrl}/api/stream`, {
      count: 1,
      onOpen: () => hub.broadcast(toSseMessage('ping.created', ping, ping.id)),
    });
    await expect.poll(() => hub.size, { timeout: 2_000 }).toBe(0);
  });
});
