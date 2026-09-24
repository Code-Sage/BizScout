import { loadEnv } from '../config/env';
import { createLogger } from '../lib/logger';
import { createDatabase } from './client';
import { runMigrations } from './migrate';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

const env = loadEnv();
const logger = createLogger({ level: env.LOG_LEVEL, pretty: env.NODE_ENV === 'development' });
const { db, pool } = createDatabase({
  url: env.DATABASE_URL,
  ssl: env.DATABASE_SSL,
  maxConnections: 1,
});

try {
  await runMigrations(db, env.MIGRATIONS_DIR);
  logger.info({ dir: env.MIGRATIONS_DIR }, 'migrations applied');
} finally {
  await pool.end();
}
