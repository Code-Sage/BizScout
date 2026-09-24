import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env';
import { createContainer, type AppContainer } from '../../src/container';
import { TEST_INTERNAL_TOKEN } from '../support/app';
import { createTestDatabase, resetDatabase, TEST_DATABASE_URL } from '../support/db';

const HTTPBIN_TEST_URL = process.env.HTTPBIN_TEST_URL;

describe.skipIf(!HTTPBIN_TEST_URL)('monitoring pipeline against go-httpbin', () => {
  const handle = createTestDatabase();
  let container: AppContainer;

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
  });
  beforeEach(() => resetDatabase(handle));
  afterAll(async () => {
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
});
