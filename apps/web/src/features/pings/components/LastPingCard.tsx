import { formatDateTime, formatRelative } from '../../../lib/format';
import { useNow } from '../../../lib/use-now';

const REFRESH_INTERVAL_MS = 15_000;

/**
 * The "Last ping" stat card, isolated so its own clock tick doesn't re-render the whole
 * StatsCards grid: without this, an unchanged stats payload never re-renders and "X ago" freezes.
 */
export function LastPingCard({ lastPingAt }: { lastPingAt: string | null }) {
  // `now` only advances on the useNow tick (every REFRESH_INTERVAL_MS); it exists purely to
  // trigger a re-render. A live ping can land between ticks with a timestamp after that stale
  // `now`, which would otherwise read as "in N seconds". Re-reading Date.now() at render time
  // and taking the max keeps the displayed value from ever trailing the real clock.
  const now = Math.max(useNow(REFRESH_INTERVAL_MS), Date.now());
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Last ping</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
        {/* lastPingAt comes from the API's clock, which may run ahead of the browser's: clamp so
            a ping that already happened never reads "in N seconds". */}
        {lastPingAt ? formatRelative(lastPingAt, Math.max(now, Date.parse(lastPingAt))) : 'Never'}
      </dd>
      <dd className="mt-1 truncate text-xs text-slate-500">
        {lastPingAt ? formatDateTime(lastPingAt) : 'Waiting for the first ping'}
      </dd>
    </div>
  );
}
