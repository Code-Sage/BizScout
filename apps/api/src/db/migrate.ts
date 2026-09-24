import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client';

export async function runMigrations(db: Database, migrationsDir: string): Promise<void> {
  await migrate(db, { migrationsFolder: path.resolve(migrationsDir) });
}
