import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/error-handler';
import { createHttpLogger } from '../../../src/http/middleware/http-logger';
import { AppError } from '../../../src/lib/errors';
import { createLogger } from '../../../src/lib/logger';

/** Minimal app wired with the same body-parsing + error-handling middleware as createApp. */
function buildTestApp(): express.Express {
  const app = express();
  app.use(createHttpLogger(createLogger({ level: 'silent', pretty: false })));
  app.use(express.json({ limit: '32kb' }));

  app.post('/boom', () => {
    throw new Error('kaboom: internal secret');
  });

  app.post('/app-error', () => {
    throw new AppError(422, 'UNPROCESSABLE', 'Nope', { field: 'x' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('returns 400 INVALID_JSON for malformed JSON bodies', async () => {
    const res = await request(buildTestApp())
      .post('/boom')
      .set('content-type', 'application/json')
      .send('{not valid json');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_JSON' });
  });

  it('returns 413 PAYLOAD_TOO_LARGE for oversized bodies', async () => {
    const oversized = JSON.stringify({ data: 'x'.repeat(40 * 1024) });
    const res = await request(buildTestApp())
      .post('/boom')
      .set('content-type', 'application/json')
      .send(oversized);

    expect(res.status).toBe(413);
    expect(res.body.error).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it('returns a generic 500 for a thrown plain Error, leaking no internals', async () => {
    const res = await request(buildTestApp()).post('/boom').send();

    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    });
    expect(JSON.stringify(res.body)).not.toContain('kaboom');
  });

  it('passes an AppError status, code and details straight through', async () => {
    const res = await request(buildTestApp()).post('/app-error').send();

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: 'UNPROCESSABLE',
      message: 'Nope',
      details: { field: 'x' },
    });
  });
});
