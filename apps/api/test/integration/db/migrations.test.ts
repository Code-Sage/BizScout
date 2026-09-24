import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../support/db';

const handle = createTestDatabase();
afterAll(() => handle.pool.end());

describe('migrations', () => {
  it('creates ping_results with the slot uniqueness index', async () => {
    const result = await handle.db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where tablename = 'ping_results' order by indexname`,
    );
    expect(result.rows.map((row) => row.indexname)).toEqual([
      'ping_results_ok_requested_at_idx',
      'ping_results_pkey',
      'ping_results_requested_at_idx',
      'ping_results_slot_start_key',
    ]);
  });
});
