import type { Express } from 'express';
import type { Env } from './config/env';
import { createDatabase } from './db/client';
import { runMigrations } from './db/migrate';
import type { AppEvents } from './events/app-events';
import { EventBus } from './events/event-bus';
import { createApp } from './http/app';
import { createLogger, type Logger } from './lib/logger';
import { HttpbinClient } from './monitoring/httpbin-client';
import { PingRepository } from './monitoring/ping-repository';
import { PingService } from './monitoring/ping-service';
import { disabledSchedulerStatus, SlotScheduler } from './monitoring/scheduler';
import { SseHub } from './realtime/sse-hub';
import { toSseMessage } from './realtime/server-events';

export interface AppContainer {
  app: Express;
  logger: Logger;
  /** Starts background work (scheduler, SSE heartbeats). */
  start(): void;
  /** Stops background work and releases the DB pool. */
  stop(): Promise<void>;
}

/** Composition root: the only place that knows how the pieces fit together. */
export async function createContainer(env: Env): Promise<AppContainer> {
  const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });

  const database = createDatabase({
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
    maxConnections: env.DATABASE_POOL_MAX,
  });
  // Without a listener, an idle client error (e.g. the pooler recycling connections) crashes Node.
  database.pool.on('error', (error) => logger.error({ err: error }, 'idle database client error'));

  if (env.RUN_MIGRATIONS_ON_BOOT) {
    await runMigrations(database.db, env.MIGRATIONS_DIR);
    logger.info('database migrations applied');
  }

  const bus = new EventBus<AppEvents>(logger);
  const pingRepository = new PingRepository(database.db);
  const prober = new HttpbinClient({ url: env.HTTPBIN_URL, timeoutMs: env.PING_TIMEOUT_MS });
  const pingService = new PingService({ store: pingRepository, prober, bus, logger });

  const hub = new SseHub(logger);
  bus.subscribe('ping.created', (ping) =>
    hub.broadcast(toSseMessage('ping.created', ping, ping.id)),
  );

  const scheduler = env.SCHEDULER_ENABLED
    ? new SlotScheduler({
        name: 'ping',
        intervalMs: env.PING_INTERVAL_MS,
        runOnStart: true,
        logger,
        job: (slotStart) => pingService.runSlot(slotStart, 'scheduler'),
      })
    : null;

  const app = createApp({
    logger,
    corsOrigins: env.CORS_ORIGINS,
    version: env.APP_VERSION,
    pings: pingRepository,
    pingService,
    hub,
    internalToken: env.INTERNAL_API_TOKEN,
    pingIntervalMs: env.PING_INTERVAL_MS,
    checkDatabase: async () => {
      await database.pool.query('select 1');
    },
    schedulerStatus: () => scheduler?.status() ?? disabledSchedulerStatus(env.PING_INTERVAL_MS),
  });

  return {
    app,
    logger,
    start() {
      hub.start();
      scheduler?.start();
    },
    async stop() {
      scheduler?.stop();
      hub.stop();
      await database.pool.end();
    },
  };
}
