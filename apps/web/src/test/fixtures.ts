import type { PingDetail, PingResult, PingStats } from '@bizscout/shared';

export function makePing(overrides: Partial<PingResult> = {}): PingResult {
  return {
    id: 1,
    requestedAt: '2026-09-24T10:05:00.000Z',
    trigger: 'scheduler',
    targetUrl: 'https://httpbin.org/anything',
    method: 'POST',
    statusCode: 200,
    ok: true,
    responseTimeMs: 245,
    responseSizeBytes: 1_024,
    errorCode: null,
    errorMessage: null,
    payloadEvent: 'listing.viewed',
    ...overrides,
  };
}

export function makePingDetail(overrides: Partial<PingDetail> = {}): PingDetail {
  return {
    ...makePing(),
    requestPayload: { event: 'listing.viewed', requestId: 'req_0000abcd' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: { json: { event: 'listing.viewed' }, method: 'POST' },
    ...overrides,
  };
}

export function makeStats(overrides: Partial<PingStats> = {}): PingStats {
  return {
    window: '24h',
    total: 288,
    successCount: 285,
    failureCount: 3,
    successRate: 285 / 288,
    avgMs: 312,
    p50Ms: 280,
    p95Ms: 640,
    p99Ms: 1_210,
    minMs: 150,
    maxMs: 2_400,
    lastPingAt: '2026-09-24T10:05:00.000Z',
    ...overrides,
  };
}
