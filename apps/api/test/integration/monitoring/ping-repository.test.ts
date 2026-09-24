import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PingRepository } from '../../../src/monitoring/ping-repository';
import { createTestDatabase, resetDatabase } from '../../support/db';
import { buildPingRow } from '../../support/factories';

const handle = createTestDatabase();
const repo = new PingRepository(handle.db);

beforeEach(() => resetDatabase(handle));
afterAll(() => handle.pool.end());

const at = (iso: string) => new Date(iso);

describe('PingRepository.insert', () => {
  it('stores a ping and returns the row with its generated id', async () => {
    const row = await repo.insert(buildPingRow());
    expect(row).toMatchObject({ id: 1, ok: true, responseTimeMs: 200 });
    expect(row?.createdAt).toBeInstanceOf(Date);
  });

  it('records a slot at most once', async () => {
    const slotStart = at('2026-09-24T10:05:00.000Z');
    const first = await repo.insert(buildPingRow({ slotStart, trigger: 'scheduler' }));
    const second = await repo.insert(buildPingRow({ slotStart, trigger: 'external_cron' }));
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('never deduplicates manual pings (NULL slot)', async () => {
    await repo.insert(buildPingRow({ slotStart: null }));
    await repo.insert(buildPingRow({ slotStart: null }));
    const page = await repo.list({ limit: 10, status: 'all' });
    expect(page.rows).toHaveLength(2);
  });
});

describe('PingRepository.existsForSlot / findById', () => {
  it('knows whether a slot has been recorded', async () => {
    const slotStart = at('2026-09-24T10:05:00.000Z');
    expect(await repo.existsForSlot(slotStart)).toBe(false);
    await repo.insert(buildPingRow({ slotStart, trigger: 'scheduler' }));
    expect(await repo.existsForSlot(slotStart)).toBe(true);
  });

  it('finds a full row by id and returns null when missing', async () => {
    const inserted = await repo.insert(buildPingRow());
    expect(await repo.findById(inserted!.id)).toMatchObject({
      id: inserted!.id,
      responseBody: { json: { event: 'listing.viewed' } },
    });
    expect(await repo.findById(999)).toBeNull();
  });
});

describe('PingRepository.list', () => {
  beforeEach(async () => {
    for (let i = 0; i < 5; i++) {
      await repo.insert(
        buildPingRow({
          requestedAt: new Date(Date.UTC(2026, 8, 24, 10, i * 5)),
          ok: i !== 2,
          statusCode: i === 2 ? 503 : 200,
          errorCode: i === 2 ? 'HTTP_ERROR' : null,
          requestPayload: { event: `event.${i}` },
        }),
      );
    }
  });

  it('returns newest first with the payload event projected', async () => {
    const page = await repo.list({ limit: 10, status: 'all' });
    expect(page.rows.map((row) => row.id)).toEqual([5, 4, 3, 2, 1]);
    expect(page.rows[0]?.payloadEvent).toBe('event.4');
    expect(page.nextCursor).toBeNull();
  });

  it('paginates with an id cursor', async () => {
    const first = await repo.list({ limit: 2, status: 'all' });
    expect(first.rows.map((row) => row.id)).toEqual([5, 4]);
    expect(first.nextCursor).toBe(4);

    const second = await repo.list({ limit: 2, status: 'all', cursor: first.nextCursor! });
    expect(second.rows.map((row) => row.id)).toEqual([3, 2]);

    const last = await repo.list({ limit: 2, status: 'all', cursor: second.nextCursor! });
    expect(last.rows.map((row) => row.id)).toEqual([1]);
    expect(last.nextCursor).toBeNull();
  });

  it('filters by outcome', async () => {
    const failures = await repo.list({ limit: 10, status: 'failure' });
    expect(failures.rows.map((row) => row.id)).toEqual([3]);
    const successes = await repo.list({ limit: 10, status: 'success' });
    expect(successes.rows).toHaveLength(4);
  });

  it('filters by time range (inclusive)', async () => {
    const page = await repo.list({
      limit: 10,
      status: 'all',
      from: at('2026-09-24T10:05:00.000Z'),
      to: at('2026-09-24T10:15:00.000Z'),
    });
    expect(page.rows.map((row) => row.id)).toEqual([4, 3, 2]);
  });

  it('projects payloadEvent as null when the event field is not a string, matching summarizeRow', async () => {
    const inserted = await repo.insert(buildPingRow({ requestPayload: { event: 42 } }));
    const page = await repo.list({ limit: 10, status: 'all' });
    expect(page.rows.find((row) => row.id === inserted?.id)?.payloadEvent).toBeNull();
  });
});

describe('PingRepository.listAfter', () => {
  it('returns pings after an id, oldest first', async () => {
    for (let i = 0; i < 4; i++) await repo.insert(buildPingRow());
    const rows = await repo.listAfter(2, 100);
    expect(rows.map((row) => row.id)).toEqual([3, 4]);
  });
});

describe('PingRepository.stats', () => {
  it('aggregates latency over successful pings only', async () => {
    const latencies = [100, 200, 300, 400, 500];
    for (const [i, ms] of latencies.entries()) {
      await repo.insert(
        buildPingRow({ responseTimeMs: ms, requestedAt: new Date(Date.UTC(2026, 8, 24, 10, i)) }),
      );
    }
    await repo.insert(
      buildPingRow({
        ok: false,
        statusCode: null,
        errorCode: 'TIMEOUT',
        responseTimeMs: 10_000,
        requestedAt: at('2026-09-24T10:30:00.000Z'),
      }),
    );

    const stats = await repo.stats(at('2026-09-24T09:00:00.000Z'), at('2026-09-24T11:00:00.000Z'));

    expect(stats).toEqual({
      total: 6,
      successCount: 5,
      avgMs: 300,
      p50Ms: 300,
      p95Ms: 480,
      p99Ms: 496,
      minMs: 100,
      maxMs: 500,
      lastPingAt: at('2026-09-24T10:30:00.000Z'),
    });
  });

  it('returns zeros and nulls for an empty window', async () => {
    const stats = await repo.stats(at('2026-09-24T09:00:00.000Z'), at('2026-09-24T11:00:00.000Z'));
    expect(stats).toEqual({
      total: 0,
      successCount: 0,
      avgMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
      minMs: null,
      maxMs: null,
      lastPingAt: null,
    });
  });
});

describe('PingRepository.series', () => {
  it('returns points in chronological order within the range', async () => {
    await repo.insert(
      buildPingRow({ requestedAt: at('2026-09-24T10:10:00.000Z'), responseTimeMs: 2 }),
    );
    await repo.insert(
      buildPingRow({ requestedAt: at('2026-09-24T10:00:00.000Z'), responseTimeMs: 1 }),
    );
    await repo.insert(
      buildPingRow({ requestedAt: at('2026-09-23T10:00:00.000Z'), responseTimeMs: 0 }),
    );

    const points = await repo.series(
      at('2026-09-24T00:00:00.000Z'),
      at('2026-09-24T23:59:59.000Z'),
    );
    expect(points).toEqual([
      { requestedAt: at('2026-09-24T10:00:00.000Z'), responseTimeMs: 1, ok: true },
      { requestedAt: at('2026-09-24T10:10:00.000Z'), responseTimeMs: 2, ok: true },
    ]);
  });
});
