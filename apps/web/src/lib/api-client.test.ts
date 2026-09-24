import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { API, server } from '../test/server';
import { ApiError, apiGet, buildUrl } from './api-client';

const schema = z.object({ value: z.number() });

describe('buildUrl', () => {
  it('joins the base URL and skips empty query values', () => {
    expect(
      buildUrl('/api/pings', { limit: 25, cursor: null, status: 'all', from: undefined }),
    ).toBe(`${API}/api/pings?limit=25&status=all`);
  });
});

describe('apiGet', () => {
  it('returns the validated body', async () => {
    server.use(http.get(`${API}/api/thing`, () => HttpResponse.json({ value: 1 })));
    await expect(apiGet('/api/thing', schema)).resolves.toEqual({ value: 1 });
  });

  it('maps the API error envelope to ApiError', async () => {
    server.use(
      http.get(`${API}/api/thing`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Ping 9 not found', requestId: 'req-1' } },
          { status: 404 },
        ),
      ),
    );
    const error = await apiGet('/api/thing', schema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Ping 9 not found',
      requestId: 'req-1',
    });
  });

  it('falls back to a generic error when the body is not an envelope', async () => {
    server.use(
      http.get(`${API}/api/thing`, () => new HttpResponse('Bad Gateway', { status: 502 })),
    );
    await expect(apiGet('/api/thing', schema)).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
    });
  });

  it('rejects bodies that do not match the contract', async () => {
    server.use(http.get(`${API}/api/thing`, () => HttpResponse.json({ value: 'one' })));
    await expect(apiGet('/api/thing', schema)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    server.use(http.get(`${API}/api/thing`, () => HttpResponse.error()));
    await expect(apiGet('/api/thing', schema)).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
