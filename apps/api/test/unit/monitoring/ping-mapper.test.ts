import { pingDetailSchema, pingResultSchema, pingStatsSchema } from '@bizscout/shared';
import { describe, expect, it } from 'vitest';
import type { PingRow } from '../../../src/db/schema';
import {
  summarizeRow,
  toPingDetail,
  toPingResult,
  toPingStats,
} from '../../../src/monitoring/ping-mapper';

const row: PingRow = {
  id: 7,
  slotStart: new Date('2026-09-24T10:05:00.000Z'),
  trigger: 'scheduler',
  requestedAt: new Date('2026-09-24T10:05:00.120Z'),
  targetUrl: 'https://httpbin.org/anything',
  method: 'POST',
  requestPayload: { event: 'offer.submitted', requestId: 'req_00000001' },
  statusCode: 200,
  ok: true,
  responseTimeMs: 321,
  responseSizeBytes: 900,
  responseHeaders: { 'content-type': 'application/json' },
  responseBody: { json: { event: 'offer.submitted' } },
  errorCode: null,
  errorMessage: null,
  createdAt: new Date('2026-09-24T10:05:00.500Z'),
};

describe('ping mapper', () => {
  it('summarizes a row and extracts the payload event', () => {
    expect(summarizeRow(row)).toMatchObject({ id: 7, payloadEvent: 'offer.submitted' });
  });

  it('uses null when the payload has no string event', () => {
    expect(summarizeRow({ ...row, requestPayload: { event: 42 } }).payloadEvent).toBeNull();
  });

  it('serializes to the shared PingResult contract', () => {
    const dto = toPingResult(summarizeRow(row));
    expect(pingResultSchema.parse(dto)).toEqual(dto);
    expect(dto.requestedAt).toBe('2026-09-24T10:05:00.120Z');
  });

  it('builds a detail record including request and response bodies', () => {
    const detail = toPingDetail(row);
    expect(pingDetailSchema.parse(detail)).toEqual(detail);
    expect(detail.requestPayload).toEqual(row.requestPayload);
    expect(detail.responseBody).toEqual(row.responseBody);
  });

  it('computes success rate and failure count for stats', () => {
    const stats = toPingStats('24h', {
      total: 4,
      successCount: 3,
      avgMs: 250,
      p50Ms: 240,
      p95Ms: 400,
      p99Ms: 410,
      minMs: 100,
      maxMs: 420,
      lastPingAt: new Date('2026-09-24T10:05:00.000Z'),
    });
    expect(pingStatsSchema.parse(stats)).toEqual(stats);
    expect(stats).toMatchObject({
      failureCount: 1,
      successRate: 0.75,
      lastPingAt: '2026-09-24T10:05:00.000Z',
    });
  });

  it('reports a null success rate for an empty window', () => {
    const stats = toPingStats('1h', {
      total: 0,
      successCount: 0,
      avgMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      minMs: null,
      maxMs: null,
      lastPingAt: null,
    });
    expect(stats).toMatchObject({ successRate: null, failureCount: 0, lastPingAt: null });
  });
});
