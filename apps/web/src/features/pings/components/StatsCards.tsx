import type { StatsWindow } from '@bizscout/shared';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { formatDateTime, formatDuration, formatPercent, formatRelative } from '../../../lib/format';
import { usePingStats } from '../hooks';

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

  if (query.isError) {
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
    {
      label: 'Last ping',
      value: stats.lastPingAt ? formatRelative(stats.lastPingAt) : 'Never',
      hint: stats.lastPingAt ? formatDateTime(stats.lastPingAt) : 'Waiting for the first ping',
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {card.label}
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{card.value}</dd>
          <dd className="mt-1 truncate text-xs text-slate-500">{card.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
