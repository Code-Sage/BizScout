import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makePing } from '../../test/fixtures';
import { MockEventSource, mockEventSourceFactory } from '../../test/mock-event-source';
import { createTestQueryClient } from '../../test/render';
import type { PingPages } from '../pings/cache';
import { pingKeys } from '../pings/query-keys';
import { useConnectionStore } from './connection-store';
import { useLiveStream } from './use-live-stream';

function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData<PingPages>(pingKeys.list('all'), {
    pageParams: [null],
    pages: [{ data: [makePing({ id: 1 })], nextCursor: null }],
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useLiveStream(mockEventSourceFactory), { wrapper });
  return { queryClient, hook, source: MockEventSource.latest() };
}

const allIds = (client: ReturnType<typeof createTestQueryClient>) =>
  client.getQueryData<PingPages>(pingKeys.list('all'))?.pages[0]?.data.map((ping) => ping.id);

describe('useLiveStream', () => {
  beforeEach(() => {
    MockEventSource.reset();
    useConnectionStore.setState({ status: 'connecting', lastEventAt: null });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connects to the API stream endpoint', () => {
    const { source } = setup();
    expect(source.url).toBe('http://localhost:4000/api/stream');
    expect(useConnectionStore.getState().status).toBe('connecting');
  });

  it('marks the connection live when the stream opens', () => {
    const { source } = setup();
    act(() => source.open());
    expect(useConnectionStore.getState().status).toBe('open');
  });

  it('merges ping.created events into the cached list', () => {
    const { source, queryClient } = setup();
    act(() => {
      source.open();
      source.emit('ping.created', makePing({ id: 2 }), '2');
    });
    expect(allIds(queryClient)).toEqual([2, 1]);
    expect(useConnectionStore.getState().lastEventAt).not.toBeNull();
  });

  it('ignores events that violate the contract', () => {
    const { source, queryClient } = setup();
    act(() => source.emit('ping.created', { id: 'nope' }));
    expect(allIds(queryClient)).toEqual([1]);
  });

  it('reports reconnecting on transient errors and schedules a reconnect on fatal ones', () => {
    const { source } = setup();

    act(() => source.fail(false));
    expect(useConnectionStore.getState().status).toBe('reconnecting');
    expect(source.closed).toBe(false); // browser handles its own reconnect for transient errors

    act(() => source.fail(true));
    expect(useConnectionStore.getState().status).toBe('reconnecting');
    expect(source.closed).toBe(true); // we close a fatally-errored source ourselves
    expect(MockEventSource.instances).toHaveLength(1); // no new source until the backoff elapses
  });

  it('refetches lists after a reconnect in case replay was not enough', () => {
    const { source, queryClient } = setup();
    act(() => source.open());
    act(() => source.fail(false));
    act(() => source.open());
    expect(queryClient.getQueryState(pingKeys.list('all'))?.isInvalidated).toBe(true);
  });

  it('closes the stream on unmount', () => {
    const { source, hook } = setup();
    hook.unmount();
    expect(source.closed).toBe(true);
    expect(useConnectionStore.getState().status).toBe('closed');
  });

  it('reconnects after a fatal error and invalidates all ping queries once the new source opens', () => {
    const { source, queryClient } = setup();
    queryClient.setQueryData(pingKeys.stats('24h'), { stale: false });
    queryClient.setQueryData(pingKeys.series('24h'), { stale: false });

    act(() => source.open());
    act(() => source.fail(true));
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => vi.advanceTimersByTime(5_000));
    expect(MockEventSource.instances).toHaveLength(2);
    const second = MockEventSource.latest();
    expect(second).not.toBe(source);
    expect(useConnectionStore.getState().status).not.toBe('open');

    act(() => second.open());
    expect(useConnectionStore.getState().status).toBe('open');
    // A new EventSource sends no Last-Event-ID, so replay may have missed events: refetch
    // everything (lists, stats, series), not only the lists.
    expect(queryClient.getQueryState(pingKeys.list('all'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(pingKeys.stats('24h'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(pingKeys.series('24h'))?.isInvalidated).toBe(true);
  });

  it('doubles the backoff on consecutive fatal errors, up to a cap', () => {
    const { source } = setup();
    act(() => source.fail(true)); // schedules a retry at 5s
    act(() => vi.advanceTimersByTime(5_000));
    expect(MockEventSource.instances).toHaveLength(2);

    const second = MockEventSource.latest();
    act(() => second.fail(true)); // schedules a retry at 10s (doubled)
    act(() => vi.advanceTimersByTime(9_999));
    expect(MockEventSource.instances).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it('resets the backoff to 5s after a successful open', () => {
    const { source } = setup();
    act(() => source.fail(true)); // -> retry at 5s
    act(() => vi.advanceTimersByTime(5_000));
    const second = MockEventSource.latest();
    act(() => second.open()); // success resets the backoff

    act(() => second.fail(true)); // should schedule another retry at 5s, not 10s
    act(() => vi.advanceTimersByTime(4_999));
    expect(MockEventSource.instances).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(MockEventSource.instances).toHaveLength(3);
  });

  it('creates no further sources when unmounted during the backoff', () => {
    const { source, hook } = setup();
    act(() => source.fail(true));
    hook.unmount();

    act(() => vi.advanceTimersByTime(60_000));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(useConnectionStore.getState().status).toBe('closed');
  });
});
