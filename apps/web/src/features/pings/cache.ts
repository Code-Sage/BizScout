import {
  PING_STATUS_FILTERS,
  type PingListResponse,
  type PingResult,
  type PingStatusFilter,
} from '@bizscout/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { pingKeys } from './query-keys';

export type PingPages = InfiniteData<PingListResponse, number | null>;

export function matchesFilter(ping: PingResult, status: PingStatusFilter): boolean {
  return status === 'all' || (status === 'success') === ping.ok;
}

/**
 * Inserts a live ping into a cached infinite list: first page, id-descending, no duplicates
 * (the server may replay events after a reconnect). Returns the same object when unchanged.
 */
export function insertPing(data: PingPages | undefined, ping: PingResult): PingPages | undefined {
  if (!data || data.pages.length === 0) return data;
  if (data.pages.some((page) => page.data.some((existing) => existing.id === ping.id))) return data;
  const [first, ...rest] = data.pages as [PingListResponse, ...PingListResponse[]];
  const merged = [...first.data, ping].sort((a, b) => b.id - a.id);
  return { ...data, pages: [{ ...first, data: merged }, ...rest] };
}

export function applyPingToCache(queryClient: QueryClient, ping: PingResult): void {
  for (const status of PING_STATUS_FILTERS) {
    if (!matchesFilter(ping, status)) continue;
    queryClient.setQueryData<PingPages>(pingKeys.list(status), (data) => insertPing(data, ping));
  }
  void queryClient.invalidateQueries({ queryKey: [...pingKeys.all, 'stats'] });
  void queryClient.invalidateQueries({ queryKey: [...pingKeys.all, 'series'] });
}
