import { describe, expect, it } from 'vitest';
import {
  STATS_WINDOW_MS,
  listPingsQuerySchema,
  pingDetailSchema,
  pingResultSchema,
  pingStatsSchema,
} from './index';

const validPing = {
  id: 42,
  requestedAt: '2026-09-24T10:05:00.000Z',
  trigger: 'scheduler',
  targetUrl: 'https://httpbin.org/anything',
  method: 'POST',
  statusCode: 200,
  ok: true,
  responseTimeMs: 231,
  responseSizeBytes: 1_024,
  errorCode: null,
  errorMessage: null,
  payloadEvent: 'listing.viewed',
};

describe('listPingsQuerySchema', () => {
  it('applies defaults when the query string is empty', () => {
    expect(listPingsQuerySchema.parse({})).toEqual({ limit: 25, status: 'all' });
  });

  it('coerces numeric strings coming from a query string', () => {
    expect(listPingsQuerySchema.parse({ limit: '10', cursor: '99', status: 'failure' })).toEqual({
      limit: 10,
      cursor: 99,
      status: 'failure',
    });
  });

  it('rejects a limit above 100', () => {
    expect(listPingsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('rejects non-ISO dates', () => {
    expect(listPingsQuerySchema.safeParse({ from: 'yesterday' }).success).toBe(false);
  });
});

describe('pingResultSchema', () => {
  it('accepts a well-formed ping', () => {
    expect(pingResultSchema.parse(validPing)).toEqual(validPing);
  });

  it('accepts a failed ping with no status code', () => {
    const failed = {
      ...validPing,
      ok: false,
      statusCode: null,
      responseSizeBytes: null,
      errorCode: 'TIMEOUT',
      errorMessage: 'Request timed out after 10000ms',
    };
    expect(pingResultSchema.safeParse(failed).success).toBe(true);
  });

  it('rejects an unknown trigger', () => {
    expect(pingResultSchema.safeParse({ ...validPing, trigger: 'cron-ish' }).success).toBe(false);
  });
});

describe('pingDetailSchema', () => {
  it('extends the summary with request and response bodies', () => {
    const detail = {
      ...validPing,
      requestPayload: { event: 'listing.viewed' },
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: { json: { event: 'listing.viewed' } },
    };
    expect(pingDetailSchema.parse(detail)).toEqual(detail);
  });
});

describe('stats contracts', () => {
  it('maps every window to a duration in ms', () => {
    expect(STATS_WINDOW_MS).toEqual({ '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000 });
  });

  it('allows empty windows (all metrics null)', () => {
    const empty = {
      window: '1h',
      total: 0,
      successCount: 0,
      failureCount: 0,
      successRate: null,
      avgMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      minMs: null,
      maxMs: null,
      lastPingAt: null,
    };
    expect(pingStatsSchema.parse(empty)).toEqual(empty);
  });
});
