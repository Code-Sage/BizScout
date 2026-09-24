import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { pingResultSchema } from '@bizscout/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';
import { createContainer, type AppContainer } from '../../src/container';
import { TEST_INTERNAL_TOKEN } from '../support/app';
import { createTestDatabase, resetDatabase, TEST_DATABASE_URL } from '../support/db';
import { collectSseEvents } from '../support/sse';

const HTTPBIN_TEST_URL = process.env.HTTPBIN_TEST_URL;

describe.skipIf(!HTTPBIN_TEST_URL)('monitoring pipeline against go-httpbin', () => {
  const handle = createTestDatabase();
  let container: AppContainer;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    container = await createContainer(
      loadEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        DATABASE_URL: TEST_DATABASE_URL,
        HTTPBIN_URL: HTTPBIN_TEST_URL,
        SCHEDULER_ENABLED: 'false',
        INTERNAL_API_TOKEN: TEST_INTERNAL_TOKEN,
      }),
    );
    server = container.app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => resetDatabase(handle));
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await container.stop();
    await handle.pool.end();
  });

  it('pings, stores the echoed payload and serves it back', async () => {
    const tick = await request(container.app)
      .post('/api/internal/tick')
      .set('x-internal-token', TEST_INTERNAL_TOKEN);
    expect(tick.status).toBe(201);

    const detail = await request(container.app).get(`/api/pings/${tick.body.ping.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ ok: true, statusCode: 200, method: 'POST' });
    // httpbin echoes the JSON body back under `json`: proves we sent the random payload.
    expect(detail.body.responseBody.json).toEqual(detail.body.requestPayload);
  });

  it('broadcasts the recorded ping to connected SSE clients (T6 deliver step)', async () => {
    let tickBody: { ping?: { id: number } } = {};

    const { events } = await collectSseEvents(`${baseUrl}/api/stream`, {
      count: 1,
      onOpen: async () => {
        const response = await fetch(`${baseUrl}/api/internal/tick`, {
          method: 'POST',
          headers: { 'x-internal-token': TEST_INTERNAL_TOKEN },
        });
        tickBody = (await response.json()) as { ping?: { id: number } };
      },
    });

    expect(tickBody.ping?.id).toBeTypeOf('number');
    const pingId = tickBody.ping!.id;

    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe('ping.created');
    expect(events[0]!.id).toBe(String(pingId));
    expect(pingResultSchema.parse(events[0]!.data)).toEqual(events[0]!.data);
    expect((events[0]!.data as { id: number }).id).toBe(pingId);
  });
});
