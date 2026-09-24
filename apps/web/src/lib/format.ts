import { formatDistanceStrict } from 'date-fns';

export function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms} ms`;
  return `${(ms / 1_000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1_024) return `${bytes} B`;
  return `${(bytes / 1_024).toFixed(1)} KB`;
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return '—';
  return ratio === 1 ? '100%' : `${(ratio * 100).toFixed(1)}%`;
}

/** Local wall-clock time, e.g. "10:05:00 AM" (user's locale and time zone). */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(iso),
  );
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  return formatDistanceStrict(new Date(iso), now, { addSuffix: true });
}

export type LatencyTone = 'fast' | 'ok' | 'slow';

/** Thresholds tuned for httpbin.org's typical 150–600 ms latency. */
export function latencyTone(ms: number): LatencyTone {
  if (ms < 500) return 'fast';
  if (ms < 1_500) return 'ok';
  return 'slow';
}
