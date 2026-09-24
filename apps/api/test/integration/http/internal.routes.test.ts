import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { AppEvents } from '../../../src/events/app-events';
import { EventBus } from '../../../src/events/event-bus';
import { createApp } from '../../../src/http/app';
import { PingRepository } from '../../../src/monitoring/ping-repository';
import { PingService } from '../../../src/monitoring/ping-service';
import { buildAppDeps, TEST_INTERNAL_TOKEN } from '../../support/app';
import { createTestDatabase, resetDatabase } from '../../support/db';
import { FakeProber } from '../../support/fakes';
import { createCapturingLogger } from '../../support/logger';

const handle = createTestDatabase();
const repo = new PingRepository(handle.db);
const { logger } = createCapturingLogger();
const pingService = new PingService({
  store: repo,
  prober: new FakeProber(),
  bus: new EventBus<AppEvents>(logger),
  logger,
});
const NOW = new Date('2026-09-24T10:07:12.000Z');
const app = createApp(buildAppDeps({ pings: repo, pingService, now: () => NOW }));

beforeEach(() => resetDatabase(handle));
afterAll(() => handle.pool.end());

describe('internal routes auth', () => {
  it('rejects requests without the token', async () => {
    const res = await request(app).post('/api/internal/tick');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong token of the same length', async () => {
    const res = await request(app)
      .post('/api/internal/tick')
      .set('x-internal-token', TEST_INTERNAL_TOKEN.replace(/.$/, 'X'));
    expect(res.status).toBe(401);
  });

  it('is disabled when no token is configured', async () => {
    const disabled = createApp(buildAppDeps({ internalToken: undefined }));
    const res = await request(disabled)
      .post('/api/internal/tick')
      .set('x-internal-token', 'anything');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('INTERNAL_API_DISABLED');
  });
});

describe('POST /api/internal/tick', () => {
  it('records the current slot once and reports duplicates as skipped', async () => {
    const first = await request(app)
      .post('/api/internal/tick')
      .set('x-internal-token', TEST_INTERNAL_TOKEN);
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ status: 'recorded', ping: { trigger: 'external_cron' } });

    const second = await request(app)
      .post('/api/internal/tick')
      .set('x-internal-token', TEST_INTERNAL_TOKEN);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: 'skipped', reason: 'already_recorded' });

    const stored = await repo.findById(first.body.ping.id);
    expect(stored?.slotStart).toEqual(new Date('2026-09-24T10:05:00.000Z'));
  });
});

describe('POST /api/internal/ping-now', () => {
  it('records a manual ping every time', async () => {
    const a = await request(app)
      .post('/api/internal/ping-now')
      .set('x-internal-token', TEST_INTERNAL_TOKEN);
    const b = await request(app)
      .post('/api/internal/ping-now')
      .set('x-internal-token', TEST_INTERNAL_TOKEN);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.ping.trigger).toBe('manual');
    expect(b.body.ping.id).toBe(a.body.ping.id + 1);
  });
});
