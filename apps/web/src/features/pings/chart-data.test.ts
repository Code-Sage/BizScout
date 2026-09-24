import { describe, expect, it } from 'vitest';
import { toChartPoints } from './chart-data';

describe('toChartPoints', () => {
  it('converts timestamps and marks failures on their own series', () => {
    expect(
      toChartPoints([
        { t: '2026-09-24T10:00:00.000Z', ms: 200, ok: true },
        { t: '2026-09-24T10:05:00.000Z', ms: 10_000, ok: false },
      ]),
    ).toEqual([
      { time: Date.parse('2026-09-24T10:00:00.000Z'), ms: 200, failedMs: null },
      { time: Date.parse('2026-09-24T10:05:00.000Z'), ms: 10_000, failedMs: 10_000 },
    ]);
  });
});
