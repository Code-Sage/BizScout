import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { HttpbinClient } from '../../../src/monitoring/httpbin-client';

const TARGET = 'http://httpbin.test/anything';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Returns the given timestamps in order (then keeps returning the last one). */
function clock(...ticks: number[]): () => number {
  let index = 0;
  return () => ticks[Math.min(index++, ticks.length - 1)] ?? 0;
}

describe('HttpbinClient', () => {
  it('POSTs the payload as JSON and returns the parsed echo', async () => {
    let receivedBody: unknown;
    let receivedContentType: string | null = null;
    server.use(
      http.post(TARGET, async ({ request }) => {
        receivedBody = await request.json();
        receivedContentType = request.headers.get('content-type');
        return HttpResponse.json({ json: receivedBody, method: request.method });
      }),
    );

    const client = new HttpbinClient({ url: TARGET, timeoutMs: 1_000, now: clock(1_000, 1_245.4) });
    const result = await client.send({ event: 'listing.viewed' });

    expect(receivedBody).toEqual({ event: 'listing.viewed' });
    expect(receivedContentType).toBe('application/json');
    expect(result).toMatchObject({
      ok: true,
      statusCode: 200,
      responseTimeMs: 245,
      errorCode: null,
      errorMessage: null,
      body: { json: { event: 'listing.viewed' }, method: 'POST' },
    });
    expect(result.headers?.['content-type']).toContain('application/json');
  });

  it('reports the decoded body size in bytes', async () => {
    server.use(http.post(TARGET, () => HttpResponse.text('héllo')));
    const result = await new HttpbinClient({ url: TARGET, timeoutMs: 1_000 }).send({});
    expect(result.responseSizeBytes).toBe(6); // "é" is two bytes in UTF-8
    expect(result.body).toBe('héllo');
    expect(result.ok).toBe(true);
  });

  it('classifies non-2xx responses as HTTP_ERROR and keeps the body', async () => {
    server.use(
      http.post(TARGET, () =>
        HttpResponse.json(
          { error: 'upstream' },
          { status: 503, statusText: 'Service Unavailable' },
        ),
      ),
    );
    const result = await new HttpbinClient({ url: TARGET, timeoutMs: 1_000 }).send({});
    expect(result).toMatchObject({
      ok: false,
      statusCode: 503,
      errorCode: 'HTTP_ERROR',
      errorMessage: 'HTTP 503 Service Unavailable',
      body: { error: 'upstream' },
    });
  });

  it('classifies a body that claims JSON but is not as INVALID_RESPONSE', async () => {
    server.use(
      http.post(
        TARGET,
        () => new HttpResponse('{not json', { headers: { 'content-type': 'application/json' } }),
      ),
    );
    const result = await new HttpbinClient({ url: TARGET, timeoutMs: 1_000 }).send({});
    expect(result).toMatchObject({
      ok: false,
      statusCode: 200,
      errorCode: 'INVALID_RESPONSE',
      body: '{not json',
    });
  });

  it('times out slow responses', async () => {
    server.use(
      http.post(TARGET, async () => {
        await delay(500);
        return HttpResponse.json({});
      }),
    );
    const result = await new HttpbinClient({ url: TARGET, timeoutMs: 50 }).send({});
    expect(result).toMatchObject({
      ok: false,
      statusCode: null,
      responseSizeBytes: null,
      headers: null,
      body: null,
      errorCode: 'TIMEOUT',
      errorMessage: 'Request timed out after 50ms',
    });
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(40);
  });

  it('classifies connection failures as NETWORK_ERROR', async () => {
    server.use(http.post(TARGET, () => HttpResponse.error()));
    const result = await new HttpbinClient({ url: TARGET, timeoutMs: 1_000 }).send({});
    expect(result).toMatchObject({ ok: false, statusCode: null, errorCode: 'NETWORK_ERROR' });
    expect(result.errorMessage).toEqual(expect.any(String));
  });

  it('exposes the target and method it uses', () => {
    const client = new HttpbinClient({ url: TARGET, timeoutMs: 1_000 });
    expect(client.url).toBe(TARGET);
    expect(client.method).toBe('POST');
  });
});
