import type { NewPingRow } from '../../src/db/schema';

export function buildPingRow(overrides: Partial<NewPingRow> = {}): NewPingRow {
  return {
    slotStart: null,
    trigger: 'manual',
    requestedAt: new Date('2026-09-24T10:00:00.000Z'),
    targetUrl: 'http://httpbin.test/anything',
    method: 'POST',
    requestPayload: { event: 'listing.viewed', requestId: 'req_00000001' },
    statusCode: 200,
    ok: true,
    responseTimeMs: 200,
    responseSizeBytes: 512,
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: { json: { event: 'listing.viewed' } },
    errorCode: null,
    errorMessage: null,
    ...overrides,
  };
}
