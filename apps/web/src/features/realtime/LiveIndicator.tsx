import clsx from 'clsx';
import { useConnectionStore, type ConnectionStatus } from './connection-store';

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Offline',
};

export function LiveIndicator() {
  const status = useConnectionStore((state) => state.status);
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
    >
      <span
        aria-hidden="true"
        className={clsx(
          'size-2.5 rounded-full',
          status === 'open' && 'animate-pulse bg-emerald-500',
          (status === 'connecting' || status === 'reconnecting') && 'bg-amber-500',
          status === 'closed' && 'bg-slate-400',
        )}
      />
      {LABELS[status]}
    </span>
  );
}
