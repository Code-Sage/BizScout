import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LastPingCard } from './LastPingCard';

describe('LastPingCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:10.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps "time ago" current as real time passes, without new data', () => {
    // lastPingAt is 10 s before the frozen "now" above.
    render(<LastPingCard lastPingAt="2026-09-24T10:00:00.000Z" />);
    expect(screen.getByText('10 seconds ago')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1_000);
    });

    expect(screen.queryByText('10 seconds ago')).not.toBeInTheDocument();
    expect(screen.getByText('10 minutes ago')).toBeInTheDocument();
  });

  it('shows "Never" when there is no ping yet', () => {
    render(<LastPingCard lastPingAt={null} />);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });
});
