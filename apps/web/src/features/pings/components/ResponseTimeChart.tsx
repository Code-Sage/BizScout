import type { StatsWindow } from '@bizscout/shared';
import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { RefreshError } from '../../../components/RefreshError';
import { Skeleton } from '../../../components/Skeleton';
import { type ChartPoint, toChartPoints } from '../chart-data';
import { usePingSeries } from '../hooks';
import { ResponseTimeTooltipCard } from './ResponseTimeTooltip';

function formatAxisTime(epochMs: number, window: StatsWindow): string {
  const options: Intl.DateTimeFormatOptions =
    window === '7d'
      ? { weekday: 'short', hour: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat(undefined, options).format(epochMs);
}

function renderTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  return active && point ? <ResponseTimeTooltipCard point={point} /> : null;
}

export function ResponseTimeChart({ window }: { window: StatsWindow }) {
  const query = usePingSeries(window);
  const data = useMemo(() => toChartPoints(query.data?.points ?? []), [query.data]);

  if (query.isPending) return <Skeleton className="h-64" />;
  // A failed background refetch also sets isError, even though `data` is still the last good
  // response (TanStack v5). Only fall back to the full-panel error when there is nothing cached.
  if (query.data === undefined) {
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
      <div className="space-y-2">
        {query.isError && <RefreshError onRetry={() => void query.refetch()} />}
        <EmptyState
          title="No pings in this window yet"
          description="The chart fills in as pings arrive."
        />
      </div>
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
      {query.isError && (
        <div className="mb-2">
          <RefreshError onRetry={() => void query.refetch()} />
        </div>
      )}
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="epochMs"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(epochMs: number) => formatAxisTime(epochMs, window)}
              fontSize={12}
            />
            <YAxis width={56} fontSize={12} />
            <Tooltip content={renderTooltip} />
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
            <Scatter dataKey="failedMs" fill="#e11d48" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
