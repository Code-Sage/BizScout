import { sql } from 'drizzle-orm';
import { createDatabase, type DatabaseHandle } from '../../src/db/client';

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgres://bizscout:bizscout@localhost:5432/bizscout_test';

export function createTestDatabase(): DatabaseHandle {
  return createDatabase({ url: TEST_DATABASE_URL, ssl: false, maxConnections: 5 });
}

/** Empties every application table. Safe because integration files run sequentially. */
export async function resetDatabase({ db }: DatabaseHandle): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE ping_results RESTART IDENTITY CASCADE`);
}
