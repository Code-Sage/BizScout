import type { PingSeriesPoint } from '@bizscout/shared';

export interface ChartPoint {
  epochMs: number;
  ms: number;
  /** Same value as `ms` for failed pings, null otherwise: drawn as red markers, and turns the tooltip red. */
  failedMs: number | null;
}

export function toChartPoints(points: PingSeriesPoint[]): ChartPoint[] {
  return points.map((point) => ({
    epochMs: Date.parse(point.t),
    ms: point.ms,
    failedMs: point.ok ? null : point.ms,
  }));
}
