import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from '../lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createHttpLogger } from './middleware/http-logger';
import { createHealthRouter } from './routes/health.routes';

export interface AppDeps {
  logger: Logger;
  corsOrigins: string[];
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render terminates TLS in front of us
  // First, so every later middleware (and the error handler) has req.id and req.log.
  app.use(createHttpLogger(deps.logger));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: deps.corsOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['content-type', 'last-event-id', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  app.use('/api', createHealthRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
