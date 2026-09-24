import type { PingStatusFilter, StatsWindow } from '@bizscout/shared';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchPingDetail, fetchPings, fetchPingSeries, fetchPingStats } from './api';
import { pingKeys } from './query-keys';

export function usePings(status: PingStatusFilter) {
  return useInfiniteQuery({
    queryKey: pingKeys.list(status),
    queryFn: ({ pageParam, signal }) => fetchPings({ status, cursor: pageParam }, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function usePingStats(window: StatsWindow) {
  return useQuery({
    queryKey: pingKeys.stats(window),
    queryFn: ({ signal }) => fetchPingStats(window, signal),
    refetchInterval: 60_000, // keeps "last ping … ago" fresh between live events
  });
}

export function usePingSeries(window: StatsWindow) {
  return useQuery({
    queryKey: pingKeys.series(window),
    queryFn: ({ signal }) => fetchPingSeries(window, signal),
  });
}

export function usePingDetail(id: number | null) {
  return useQuery({
    queryKey: pingKeys.detail(id ?? 0),
    queryFn: ({ signal }) => fetchPingDetail(id as number, signal),
    enabled: id !== null,
  });
}
