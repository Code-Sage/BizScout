import { formatDateTime, formatRelative } from '../../../lib/format';
import { useNow } from '../../../lib/use-now';

const REFRESH_INTERVAL_MS = 15_000;

/**
 * The "Last ping" stat card, isolated so its own clock tick doesn't re-render the whole
 * StatsCards grid: without this, an unchanged stats payload never re-renders and "X ago" freezes.
 */
export function LastPingCard({ lastPingAt }: { lastPingAt: string | null }) {
  const now = useNow(REFRESH_INTERVAL_MS);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Last ping</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
        {lastPingAt ? formatRelative(lastPingAt, now) : 'Never'}
      </dd>
      <dd className="mt-1 truncate text-xs text-slate-500">
        {lastPingAt ? formatDateTime(lastPingAt) : 'Waiting for the first ping'}
      </dd>
    </div>
  );
}
