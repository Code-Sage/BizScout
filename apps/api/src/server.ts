import { loadEnv } from './config/env';
import { createContainer } from './container';

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
  const container = await createContainer(env);
  const { app, logger } = container;

  process.on('unhandledRejection', (reason) =>
    logger.error({ err: reason }, 'unhandled rejection'),
  );

  const server = app.listen(env.PORT, (error) => {
    if (error) {
      // e.g. EADDRINUSE: fail loudly instead of running the scheduler without an HTTP server.
      logger.fatal({ err: error }, 'failed to bind port');
      process.exit(1);
    }
    logger.info({ port: env.PORT, version: env.APP_VERSION }, 'api listening');
    container.start();
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close();
    // stop() ends open SSE streams, which lets server.close() complete, then drains the pool.
    container.stop().then(
      () => process.exit(0),
      (error: unknown) => {
        logger.error({ err: error }, 'error during shutdown');
        process.exit(1);
      },
    );
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error: unknown) => {
  console.error('Fatal startup error', error);
  process.exit(1);
});
