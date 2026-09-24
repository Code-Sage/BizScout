import { sql } from 'drizzle-orm';
import { loadEnv } from './config/env';
import { createDatabase } from './db/client';
import { createApp } from './http/app';
import { createLogger } from './lib/logger';
import { PingRepository } from './monitoring/ping-repository';
import { disabledSchedulerStatus } from './monitoring/scheduler';
import { SseHub } from './realtime/sse-hub';

function loadDotEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the real environment.
  }
}

// Rejects until Task 10 (internal trigger routes) and Task 11 (composition root, scheduler) wire
// a real PingService; nothing in the HTTP surface built so far invokes it.
const pingServiceNotWired = (): Promise<never> =>
  Promise.reject(new Error('pingService is not wired until Task 10/11'));

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') loadDotEnvFile();

  const env = loadEnv();
  const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });

  const database = createDatabase({
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
    maxConnections: env.DATABASE_POOL_MAX,
  });
  const pings = new PingRepository(database.db);
  const hub = new SseHub(logger);
  hub.start();

  const app = createApp({
    logger,
    corsOrigins: env.CORS_ORIGINS,
    version: env.APP_VERSION,
    pings,
    pingService: { runSlot: pingServiceNotWired, runManual: pingServiceNotWired },
    hub,
    internalToken: env.INTERNAL_API_TOKEN,
    pingIntervalMs: env.PING_INTERVAL_MS,
    checkDatabase: () => database.db.execute(sql`select 1`).then(() => undefined),
    // TODO(Task 11): replace with a real SlotScheduler status once the scheduler is wired here.
    schedulerStatus: () => disabledSchedulerStatus(env.PING_INTERVAL_MS),
  });

  const server = app.listen(env.PORT, (error?: Error) => {
    if (error) {
      logger.fatal({ err: error }, 'failed to bind port');
      process.exit(1);
    }
    logger.info({ port: env.PORT, version: env.APP_VERSION }, 'api listening');
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutting down');
    hub.stop();
    server.close(() => {
      void database.pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error: unknown) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
