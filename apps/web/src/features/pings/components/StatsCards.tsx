import type { StatsWindow } from '@bizscout/shared';
import { ErrorState } from '../../../components/ErrorState';
import { RefreshError } from '../../../components/RefreshError';
import { Skeleton } from '../../../components/Skeleton';
import { formatDuration, formatPercent } from '../../../lib/format';
import { usePingStats } from '../hooks';
import { LastPingCard } from './LastPingCard';

const ms = (value: number | null) => (value === null ? '—' : formatDuration(value));

export function StatsCards({ window }: { window: StatsWindow }) {
  const query = usePingStats(window);

  if (query.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  // A failed background refetch also sets isError, even though `data` is still the last good
  // response (TanStack v5). Only fall back to the full-panel error when there is nothing cached.
  if (query.data === undefined) {
    return (
      <ErrorState
        title="Couldn't load statistics"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const stats = query.data;
  const cards = [
    {
      label: 'Success rate',
      value: formatPercent(stats.successRate),
      hint: `${stats.successCount}/${stats.total} pings`,
    },
    { label: 'Average response', value: ms(stats.avgMs), hint: `p50 ${ms(stats.p50Ms)}` },
    { label: 'p95 response', value: ms(stats.p95Ms), hint: `max ${ms(stats.maxMs)}` },
  ];

  return (
    <div className="space-y-2">
      {query.isError && <RefreshError onRetry={() => void query.refetch()} />}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {card.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
              {card.value}
            </dd>
            <dd className="mt-1 truncate text-xs text-slate-500">{card.hint}</dd>
          </div>
        ))}
        <LastPingCard lastPingAt={stats.lastPingAt} />
      </dl>
    </div>
  );
}
