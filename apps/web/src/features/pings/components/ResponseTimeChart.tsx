import type { StatsWindow } from '@bizscout/shared';
import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { formatDateTime } from '../../../lib/format';
import { toChartPoints } from '../chart-data';
import { usePingSeries } from '../hooks';

function formatAxisTime(time: number, window: StatsWindow): string {
  const options: Intl.DateTimeFormatOptions =
    window === '7d'
      ? { weekday: 'short', hour: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat(undefined, options).format(time);
}

export function ResponseTimeChart({ window }: { window: StatsWindow }) {
  const query = usePingSeries(window);
  const data = useMemo(() => toChartPoints(query.data?.points ?? []), [query.data]);

  if (query.isPending) return <Skeleton className="h-64" />;
  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load the response-time chart"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title="No pings in this window yet"
        description="The chart fills in as pings arrive."
      />
    );
  }

  return (
    <figure
      aria-label={`Response time, last ${window}`}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <figcaption className="mb-2 text-sm font-medium text-slate-700">
        Response time (ms) · failures in red
      </figcaption>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(time: number) => formatAxisTime(time, window)}
              fontSize={12}
            />
            <YAxis width={56} fontSize={12} />
            <Tooltip
              labelFormatter={(time) => formatDateTime(new Date(Number(time)).toISOString())}
            />
            <Line
              // Linear, not smoothed: a monitoring chart must not invent values between samples.
              type="linear"
              dataKey="ms"
              name="Response time"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter dataKey="failedMs" name="Failed" fill="#e11d48" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
