import type { ApiErrorBody } from '@bizscout/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../../lib/errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};

function isBodyParserError(err: unknown): boolean {
  return err instanceof SyntaxError && typeof (err as { status?: unknown }).status === 'number';
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
    if (err.statusCode >= 500) req.log.error({ err }, err.message);
    send(err.statusCode, {
      code: err.code,
      message: err.message,
      ...(err.details === undefined ? {} : { details: err.details }),
    });
    return;
  }

  if (isBodyParserError(err)) {
    send(400, { code: 'INVALID_JSON', message: 'Request body is not valid JSON' });
    return;
  }

  req.log.error({ err }, 'unhandled error');
  send(500, { code: 'INTERNAL_ERROR', message: 'Something went wrong' });
};
