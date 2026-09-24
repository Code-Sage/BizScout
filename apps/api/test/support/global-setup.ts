import { runMigrations } from '../../src/db/migrate';
import { createTestDatabase } from './db';

/** Vitest global setup for the integration project: bring the test DB schema up to date once. */
export default async function setup(): Promise<void> {
  const handle = createTestDatabase();
  try {
    await runMigrations(handle.db, './drizzle');
  } finally {
    await handle.pool.end();
  }
}
