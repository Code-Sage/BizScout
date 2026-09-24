import { describe, expect, it } from 'vitest';
import { pingResultSchema } from './pings';
import { serverEventSchemas } from './index';

const VALID_PING_RESULT = {
  id: 1,
  requestedAt: '2026-09-24T00:00:00.000Z',
  trigger: 'scheduler',
  targetUrl: 'https://httpbin.org/anything',
  method: 'GET',
  statusCode: 200,
  ok: true,
  responseTimeMs: 120,
  responseSizeBytes: 256,
  errorCode: null,
  errorMessage: null,
  payloadEvent: null,
};

describe('serverEventSchemas', () => {
  it('maps ping.created to the ping result schema', () => {
    expect(serverEventSchemas['ping.created']).toBe(pingResultSchema);
  });

  it('parses a valid ping.created payload', () => {
    const result = serverEventSchemas['ping.created'].safeParse(VALID_PING_RESULT);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid ping.created payload', () => {
    const result = serverEventSchemas['ping.created'].safeParse({ id: 'not-a-number' });
    expect(result.success).toBe(false);
  });
});
