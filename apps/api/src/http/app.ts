import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from '../lib/logger';
import type { PingQueries } from '../monitoring/ping-repository';
import type { PingService } from '../monitoring/ping-service';
import type { SchedulerStatus } from '../monitoring/scheduler';
import type { SseHub } from '../realtime/sse-hub';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createHttpLogger } from './middleware/http-logger';
import { createHealthRouter } from './routes/health.routes';
import { createInternalRouter } from './routes/internal.routes';
import { createPingsRouter } from './routes/pings.routes';
import { createStreamRouter } from './routes/stream.routes';

export interface AppDeps {
  logger: Logger;
  corsOrigins: string[];
  version: string;
  pings: PingQueries;
  pingService: Pick<PingService, 'runSlot' | 'runManual'>;
  hub: SseHub;
  internalToken: string | undefined;
  pingIntervalMs: number;
  checkDatabase: () => Promise<void>;
  schedulerStatus: () => SchedulerStatus;
  now?: () => Date;
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

  app.use(
    '/api',
    createHealthRouter({
      version: deps.version,
      checkDatabase: deps.checkDatabase,
      schedulerStatus: deps.schedulerStatus,
      sseClients: () => deps.hub.size,
    }),
  );
  app.use('/api', createStreamRouter({ hub: deps.hub, pings: deps.pings, logger: deps.logger }));
  app.use('/api/pings', createPingsRouter({ pings: deps.pings, now: deps.now }));
  app.use(
    '/api/internal',
    createInternalRouter({
      pingService: deps.pingService,
      intervalMs: deps.pingIntervalMs,
      internalToken: deps.internalToken,
      now: deps.now,
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
