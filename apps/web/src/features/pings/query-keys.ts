import type { PingStatusFilter, StatsWindow } from '@bizscout/shared';

export const pingKeys = {
  all: ['pings'] as const,
  lists: () => ['pings', 'list'] as const,
  list: (status: PingStatusFilter) => ['pings', 'list', status] as const,
  detail: (id: number) => ['pings', 'detail', id] as const,
  stats: (window: StatsWindow) => ['pings', 'stats', window] as const,
  series: (window: StatsWindow) => ['pings', 'series', window] as const,
};
