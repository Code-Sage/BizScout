import type { ApiErrorBody } from '@bizscout/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../../lib/errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};

/**
 * body-parser (and other middleware built on `http-errors`) throws errors with
 * `expose: true` and a 4xx `status` for client mistakes — bad JSON, oversized
 * bodies, unsupported encodings. Anything else is ours to treat as a 500.
 */
interface ClientError {
  status: number;
  type?: string;
}

function isClientError(err: unknown): err is ClientError {
  if (!(err instanceof Error)) return false;
  const candidate = err as { expose?: unknown; status?: unknown };
  return (
    candidate.expose === true &&
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
}

function classifyClientError(err: ClientError): { code: string; message: string } {
  switch (err.type) {
    case 'entity.parse.failed':
      return { code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
    case 'entity.too.large':
      return { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' };
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported content encoding or charset' };
    default:
      return { code: 'BAD_REQUEST', message: 'Request could not be processed' };
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const requestId = req.id === undefined ? undefined : String(req.id);
  const send = (status: number, error: Omit<ApiErrorBody['error'], 'requestId'>): void => {
    const body: ApiErrorBody = { error: { ...error, requestId } };
    res.status(status).json(body);
  };

  if (err instanceof ZodError) {
    send(400, {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    // Let pino-http's own completion log carry the real error instead of
    // logging it here too (it reads `res.err`; see http-logger's customLogLevel).
    if (err.statusCode >= 500) res.err = err;
    send(err.statusCode, {
      code: err.code,
      message: err.message,
      ...(err.details === undefined ? {} : { details: err.details }),
    });
    return;
  }

  if (isClientError(err)) {
    send(err.status, classifyClientError(err));
    return;
  }

  res.err = err instanceof Error ? err : undefined;
  send(500, { code: 'INTERNAL_ERROR', message: 'Something went wrong' });
};
