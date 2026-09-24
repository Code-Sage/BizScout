import {
  pingDetailSchema,
  pingListResponseSchema,
  pingSeriesResponseSchema,
  pingStatsSchema,
} from '@bizscout/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/http/app';
import { PingRepository } from '../../../src/monitoring/ping-repository';
import { buildAppDeps } from '../../support/app';
import { createTestDatabase, resetDatabase } from '../../support/db';
import { buildPingRow } from '../../support/factories';

const handle = createTestDatabase();
const repo = new PingRepository(handle.db);
const NOW = new Date('2026-09-24T12:00:00.000Z');
const app = createApp(buildAppDeps({ pings: repo, now: () => NOW }));

beforeEach(async () => {
  await resetDatabase(handle);
  // 30 pings, one every 5 minutes ending at NOW; every 10th fails.
  for (let i = 29; i >= 0; i--) {
    const failed = i % 10 === 0;
    await repo.insert(
      buildPingRow({
        requestedAt: new Date(NOW.getTime() - i * 300_000),
        responseTimeMs: 100 + i,
        ok: !failed,
        statusCode: failed ? 502 : 200,
        errorCode: failed ? 'HTTP_ERROR' : null,
        errorMessage: failed ? 'HTTP 502 Bad Gateway' : null,
      }),
    );
  }
});
afterAll(() => handle.pool.end());

describe('GET /api/pings', () => {
  it('returns the newest 25 by default in the shared contract shape', async () => {
    const res = await request(app).get('/api/pings');
    expect(res.status).toBe(200);
    const body = pingListResponseSchema.parse(res.body);
    expect(body.data).toHaveLength(25);
    expect(body.data[0]?.id).toBe(30);
    expect(body.nextCursor).toBe(6);
  });

  it('follows the cursor to the next page', async () => {
    const res = await request(app).get('/api/pings').query({ limit: 25, cursor: 6 });
    const body = pingListResponseSchema.parse(res.body);
    expect(body.data.map((ping) => ping.id)).toEqual([5, 4, 3, 2, 1]);
    expect(body.nextCursor).toBeNull();
  });

  it('filters failures', async () => {
    const res = await request(app).get('/api/pings').query({ status: 'failure' });
    const body = pingListResponseSchema.parse(res.body);
    expect(body.data.every((ping) => !ping.ok)).toBe(true);
    expect(body.data).toHaveLength(3);
  });

  it('rejects invalid query parameters with details', async () => {
    const res = await request(app).get('/api/pings').query({ limit: 0, status: 'maybe' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((detail: { path: string }) => detail.path).sort()).toEqual([
      'limit',
      'status',
    ]);
  });
});

describe('GET /api/pings/:id', () => {
  it('returns the full record including bodies', async () => {
    const res = await request(app).get('/api/pings/7');
    expect(res.status).toBe(200);
    const detail = pingDetailSchema.parse(res.body);
    expect(detail).toMatchObject({ id: 7, requestPayload: { event: 'listing.viewed' } });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/pings/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Ping 9999 not found' });
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/pings/abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/pings/stats', () => {
  it('aggregates the requested window ending now', async () => {
    const res = await request(app).get('/api/pings/stats').query({ window: '1h' });
    expect(res.status).toBe(200);
    const stats = pingStatsSchema.parse(res.body);
    // 1h window at 5-minute cadence, inclusive of both ends: offsets 0..12 => 13 pings.
    expect(stats).toMatchObject({
      window: '1h',
      total: 13,
      failureCount: 2,
      lastPingAt: NOW.toISOString(),
    });
  });

  it('defaults to 24h', async () => {
    const res = await request(app).get('/api/pings/stats');
    expect(pingStatsSchema.parse(res.body)).toMatchObject({ window: '24h', total: 30 });
  });
});

describe('GET /api/pings/series', () => {
  it('returns chronological points for charting', async () => {
    const res = await request(app).get('/api/pings/series').query({ window: '1h' });
    const series = pingSeriesResponseSchema.parse(res.body);
    expect(series.points).toHaveLength(13);
    expect(series.points.at(-1)).toEqual({ t: NOW.toISOString(), ms: 100, ok: false });
  });
});
