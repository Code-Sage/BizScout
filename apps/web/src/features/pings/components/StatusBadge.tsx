import type { PingErrorCode, PingResult } from '@bizscout/shared';
import clsx from 'clsx';

const FAILURE_LABELS: Record<PingErrorCode, string> = {
  TIMEOUT: 'Timeout',
  NETWORK_ERROR: 'Network',
  HTTP_ERROR: 'HTTP error',
  INVALID_RESPONSE: 'Invalid',
};

export function StatusBadge({
  ping,
}: {
  ping: Pick<PingResult, 'ok' | 'statusCode' | 'errorCode'>;
}) {
  const label =
    ping.statusCode !== null
      ? String(ping.statusCode)
      : FAILURE_LABELS[ping.errorCode ?? 'NETWORK_ERROR'];
  const description = ping.statusCode !== null ? `HTTP ${ping.statusCode}` : label;
  return (
    <span
      aria-label={`${ping.ok ? 'Success' : 'Failure'}, ${description}`}
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ping.ok
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-rose-50 text-rose-700 ring-rose-600/20',
      )}
    >
      {label}
    </span>
  );
}
