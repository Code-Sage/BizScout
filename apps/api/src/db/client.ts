import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseOptions {
  url: string;
  /** Managed Postgres (Supabase) requires TLS; local Docker does not. */
  ssl: boolean;
  maxConnections: number;
}

export interface DatabaseHandle {
  db: Database;
  pool: pg.Pool;
}

export function createDatabase({ url, ssl, maxConnections }: DatabaseOptions): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString: url,
    max: maxConnections,
    // Supabase's pooler presents a certificate chain Node doesn't trust by default; traffic is
    // still encrypted. Pinning the CA is listed under future improvements.
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
}
