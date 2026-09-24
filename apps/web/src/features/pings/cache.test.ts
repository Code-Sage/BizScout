import { describe, expect, it } from 'vitest';
import { createTestQueryClient } from '../../test/render';
import { makePing } from '../../test/fixtures';
import { applyPingToCache, insertPing, matchesFilter, type PingPages } from './cache';
import { pingKeys } from './query-keys';

const pages = (ids: number[][]): PingPages => ({
  pageParams: ids.map((_, index) => (index === 0 ? null : 100 - index)),
  pages: ids.map((group) => ({ data: group.map((id) => makePing({ id })), nextCursor: null })),
});

describe('insertPing', () => {
  it('adds a new ping at the top of the first page', () => {
    const result = insertPing(pages([[3, 2], [1]]), makePing({ id: 4 }));
    expect(result?.pages[0]?.data.map((ping) => ping.id)).toEqual([4, 3, 2]);
    expect(result?.pages[1]?.data.map((ping) => ping.id)).toEqual([1]);
  });

  it('keeps id-descending order when events arrive out of order', () => {
    const result = insertPing(pages([[5, 3]]), makePing({ id: 4 }));
    expect(result?.pages[0]?.data.map((ping) => ping.id)).toEqual([5, 4, 3]);
  });

  it('ignores a ping that is already cached (replay / double delivery)', () => {
    const data = pages([[3, 2]]);
    expect(insertPing(data, makePing({ id: 2 }))).toBe(data);
  });

  it('leaves an unloaded list alone', () => {
    expect(insertPing(undefined, makePing())).toBeUndefined();
  });
});

describe('matchesFilter', () => {
  it('routes pings to the right filtered lists', () => {
    expect(matchesFilter(makePing({ ok: true }), 'all')).toBe(true);
    expect(matchesFilter(makePing({ ok: true }), 'success')).toBe(true);
    expect(matchesFilter(makePing({ ok: true }), 'failure')).toBe(false);
    expect(matchesFilter(makePing({ ok: false }), 'failure')).toBe(true);
  });
});

describe('applyPingToCache', () => {
  it('updates matching lists and invalidates stats and series', () => {
    const client = createTestQueryClient();
    client.setQueryData(pingKeys.list('all'), pages([[1]]));
    client.setQueryData(pingKeys.list('failure'), pages([[]]));
    client.setQueryData(pingKeys.stats('24h'), { stale: false });
    client.setQueryData(pingKeys.series('24h'), { stale: false });

    applyPingToCache(client, makePing({ id: 2, ok: true }));

    expect(client.getQueryData<PingPages>(pingKeys.list('all'))?.pages[0]?.data).toHaveLength(2);
    expect(client.getQueryData<PingPages>(pingKeys.list('failure'))?.pages[0]?.data).toHaveLength(
      0,
    );
    expect(client.getQueryState(pingKeys.stats('24h'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(pingKeys.series('24h'))?.isInvalidated).toBe(true);
  });
});
