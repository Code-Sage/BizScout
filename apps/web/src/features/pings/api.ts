import {
  pingDetailSchema,
  pingListResponseSchema,
  pingSeriesResponseSchema,
  pingStatsSchema,
  type PingStatusFilter,
  type StatsWindow,
} from '@bizscout/shared';
import { apiGet } from '../../lib/api-client';

export const PAGE_SIZE = 25;

export function fetchPings(
  params: { status: PingStatusFilter; cursor: number | null },
  signal?: AbortSignal,
) {
  return apiGet('/api/pings', pingListResponseSchema, {
    signal,
    query: { limit: PAGE_SIZE, status: params.status, cursor: params.cursor },
  });
}

export function fetchPingStats(window: StatsWindow, signal?: AbortSignal) {
  return apiGet('/api/pings/stats', pingStatsSchema, { signal, query: { window } });
}

export function fetchPingSeries(window: StatsWindow, signal?: AbortSignal) {
  return apiGet('/api/pings/series', pingSeriesResponseSchema, { signal, query: { window } });
}

export function fetchPingDetail(id: number, signal?: AbortSignal) {
  return apiGet(`/api/pings/${id}`, pingDetailSchema, { signal });
}
