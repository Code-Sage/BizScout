import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatPercent, formatRelative, latencyTone } from './format';

describe('format helpers', () => {
  it('formats durations in ms below a second and seconds above', () => {
    expect(formatDuration(245)).toBe('245 ms');
    expect(formatDuration(1_234)).toBe('1.23 s');
    expect(formatDuration(12_345)).toBe('12.3 s');
  });

  it('formats byte sizes', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1_536)).toBe('1.5 KB');
  });

  it('formats ratios as percentages', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(0.98958)).toBe('99.0%');
  });

  it('formats relative times against an explicit clock', () => {
    const now = Date.parse('2026-09-24T10:10:00.000Z');
    expect(formatRelative('2026-09-24T10:05:00.000Z', now)).toBe('5 minutes ago');
  });

  it('classifies latency into tones', () => {
    expect(latencyTone(200)).toBe('fast');
    expect(latencyTone(800)).toBe('ok');
    expect(latencyTone(2_000)).toBe('slow');
  });
});
