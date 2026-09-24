import type { PingSeriesPoint } from '@bizscout/shared';

export interface ChartPoint {
  time: number;
  ms: number;
  /** Same value as `ms` for failed pings, null otherwise: drawn as red markers. */
  failedMs: number | null;
}

export function toChartPoints(points: PingSeriesPoint[]): ChartPoint[] {
  return points.map((point) => ({
    time: Date.parse(point.t),
    ms: point.ms,
    failedMs: point.ok ? null : point.ms,
  }));
}
