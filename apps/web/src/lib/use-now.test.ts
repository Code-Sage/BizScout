import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './use-now';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks on the given interval', () => {
    const { result } = renderHook(() => useNow(15_000));
    expect(result.current).toBe(Date.parse('2026-09-24T10:00:00.000Z'));

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current).toBe(Date.parse('2026-09-24T10:00:15.000Z'));
  });

  it('stops ticking after unmount', () => {
    const { result, unmount } = renderHook(() => useNow(15_000));
    unmount();

    act(() => {
      vi.advanceTimersByTime(300_000);
    });
    // No re-render happened, so the last committed value is unchanged.
    expect(result.current).toBe(Date.parse('2026-09-24T10:00:00.000Z'));
  });
});
