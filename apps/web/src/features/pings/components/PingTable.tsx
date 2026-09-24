import type { PingStatusFilter } from '@bizscout/shared';
import clsx from 'clsx';
import { useMemo } from 'react';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { formatBytes, formatClock, formatDateTime } from '../../../lib/format';
import { usePings } from '../hooks';
import { useFreshIds } from '../use-fresh-ids';
import { LatencyValue } from './LatencyValue';
import { StatusBadge } from './StatusBadge';

interface PingTableProps {
  status: PingStatusFilter;
  onSelect: (id: number) => void;
}

const TRIGGER_LABELS = { scheduler: 'Scheduler', external_cron: 'Cron', manual: 'Manual' } as const;

export function PingTable({ status, onSelect }: PingTableProps) {
  const query = usePings(status);
  const rows = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
  const freshIds = useFreshIds(rows);

  if (query.isPending) {
    return (
      <div
        data-testid="ping-table-skeleton"
        className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load responses"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No responses yet"
        description={
          status === 'all'
            ? 'The first ping runs within five minutes of the API starting.'
            : 'Nothing matches this filter yet.'
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">Monitoring responses, newest first</caption>
          <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Time
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Response time
              </th>
              <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell">
                Size
              </th>
              <th scope="col" className="hidden px-4 py-3 md:table-cell">
                Payload event
              </th>
              <th scope="col" className="hidden px-4 py-3 lg:table-cell">
                Trigger
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((ping) => {
              const fresh = freshIds.has(ping.id);
              return (
                <tr
                  key={ping.id}
                  data-testid="ping-row"
                  data-ping-id={ping.id}
                  data-fresh={fresh}
                  onClick={() => onSelect(ping.id)}
                  className={clsx('cursor-pointer hover:bg-slate-50', fresh && 'animate-flash')}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(ping.id);
                      }}
                      className="rounded font-medium text-slate-900 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
                    >
                      <time dateTime={ping.requestedAt} title={formatDateTime(ping.requestedAt)}>
                        {formatClock(ping.requestedAt)}
                      </time>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge ping={ping} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <LatencyValue ms={ping.responseTimeMs} />
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                    {formatBytes(ping.responseSizeBytes)}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <code className="text-xs text-slate-600">{ping.payloadEvent ?? '—'}</code>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                    {TRIGGER_LABELS[ping.trigger]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {query.hasNextPage && (
        <div className="border-t border-slate-100 p-3 text-center">
          <button
            type="button"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load older responses'}
          </button>
        </div>
      )}
    </div>
  );
}
