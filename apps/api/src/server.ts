import { loadEnv } from './config/env';
import { createApp } from './http/app';
import { createLogger } from './lib/logger';

function loadDotEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the real environment.
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') loadDotEnvFile();

  const env = loadEnv();
  const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });
  const app = createApp({ logger, corsOrigins: env.CORS_ORIGINS });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, version: env.APP_VERSION }, 'api listening');
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error: unknown) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
