import clsx from 'clsx';
import { formatDuration, latencyTone } from '../../../lib/format';

export function LatencyValue({ ms }: { ms: number }) {
  const tone = latencyTone(ms);
  return (
    <span
      data-tone={tone}
      className={clsx(
        'tabular-nums',
        tone === 'fast' && 'text-emerald-700',
        tone === 'ok' && 'text-amber-700',
        tone === 'slow' && 'font-semibold text-rose-700',
      )}
    >
      {formatDuration(ms)}
    </span>
  );
}
