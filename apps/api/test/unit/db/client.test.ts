import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, type DatabaseHandle } from '../../../src/db/client';

describe('createDatabase', () => {
  let handle: DatabaseHandle | undefined;

  afterEach(async () => {
    // Constructing a pg.Pool never opens a connection by itself, but end() is cheap and keeps
    // this test from leaking a handle if that ever changes.
    await handle?.pool.end();
    handle = undefined;
  });

  it('sets a query_timeout so a hung query cannot stall the scheduler forever', () => {
    handle = createDatabase({
      url: 'postgres://bizscout:bizscout@localhost:5432/bizscout',
      ssl: false,
      maxConnections: 5,
    });

    expect(handle.pool.options.query_timeout).toBe(15_000);
  });
});
