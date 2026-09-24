import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ServiceUnavailableError, UnauthorizedError } from '../../lib/errors';

/** Shared-secret guard for machine-to-machine endpoints (external cron, E2E seeding). */
export function requireInternalToken(expected: string | undefined): RequestHandler {
  return (req, _res, next) => {
    if (!expected) {
      next(
        new ServiceUnavailableError(
          'INTERNAL_API_DISABLED',
          'Internal API is disabled: INTERNAL_API_TOKEN is not configured',
        ),
      );
      return;
    }
    const provided = Buffer.from(req.header('x-internal-token') ?? '');
    const wanted = Buffer.from(expected);
    // Constant-time comparison: don't leak how many leading characters matched.
    if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
      next(new UnauthorizedError('Missing or invalid x-internal-token header'));
      return;
    }
    next();
  };
}
