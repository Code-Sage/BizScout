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

  it('never reads "in N seconds" for a ping that arrives between useNow ticks', () => {
    // useNow only commits a new `now` every 15 s. If a live ping lands in between, its
    // timestamp can be after the last committed `now` while still being in the past for real.
    const { rerender } = render(<LastPingCard lastPingAt="2026-09-24T10:00:00.000Z" />);
    expect(screen.getByText('10 seconds ago')).toBeInTheDocument();

    // Real time (and Date.now()) moves forward by 5 s, well inside the 15 s tick, so useNow's
    // committed `now` is still frozen at the initial mount value (10:00:10.000Z).
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // A fresh ping arrives 3 s after the last committed `now`, but 2 s before real "now".
    rerender(<LastPingCard lastPingAt="2026-09-24T10:00:13.000Z" />);

    expect(screen.queryByText(/^in \d+ seconds?$/)).not.toBeInTheDocument();
    expect(screen.getByText('2 seconds ago')).toBeInTheDocument();
  });

  it('never reads "in N seconds" when the server clock runs ahead of the browser', () => {
    // lastPingAt is stamped by the API's clock. Here it is 3 s after the browser's Date.now().
    render(<LastPingCard lastPingAt="2026-09-24T10:00:13.000Z" />);

    expect(screen.queryByText(/^in \d+ seconds?$/)).not.toBeInTheDocument();
    expect(screen.getByText('0 seconds ago')).toBeInTheDocument();
  });
});
