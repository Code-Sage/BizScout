import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/http/app';
import { buildAppDeps } from '../../support/app';

const app = createApp(buildAppDeps());

describe('createApp', () => {
  it('reports healthy when the database answers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      database: 'up',
      version: 'test',
      scheduler: { enabled: false },
      sseClients: 0,
    });
  });

  it('reports degraded with 503 when the database is unreachable', async () => {
    const degraded = createApp(
      buildAppDeps({ checkDatabase: () => Promise.reject(new Error('down')) }),
    );
    const res = await request(degraded).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
  });

  it('returns the error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });

  it('propagates a caller-provided request id', async () => {
    const res = await request(app).get('/api/health').set('x-request-id', 'req-123');
    expect(res.headers['x-request-id']).toBe('req-123');
  });

  it('generates a request id when the caller sends an unsafe one', async () => {
    const res = await request(app).get('/api/health').set('x-request-id', '<script>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('allows CORS only from configured origins', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does not advertise the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
