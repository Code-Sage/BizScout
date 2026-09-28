import clsx from 'clsx';
import { formatDateTime, formatDuration } from '../../../lib/format';
import type { ChartPoint } from '../chart-data';

function StatusIcon({ failed }: { failed: boolean }) {
  return (
    <svg
      role="img"
      aria-label={failed ? 'Failed' : 'Succeeded'}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      {failed ? <path d="M4 4l8 8M12 4l-8 8" /> : <path d="M3 8.5l3.5 3.5L13 4.5" />}
    </svg>
  );
}

export function ResponseTimeTooltipCard({ point }: { point: ChartPoint }) {
  const failed = point.failedMs !== null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-slate-600">{formatDateTime(new Date(point.epochMs).toISOString())}</p>
      <p className="text-slate-600 tabular-nums">{`Epoch (ms): ${point.epochMs}`}</p>
      <p
        className={clsx(
          'mt-1 flex items-center gap-1.5 font-medium',
          failed ? 'text-rose-700' : 'text-emerald-700',
        )}
      >
        <StatusIcon failed={failed} />
        {`Response time: ${formatDuration(point.ms)}`}
      </p>
    </div>
  );
}
