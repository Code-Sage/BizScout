import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('reports reconnecting on transient errors and closed on fatal ones', () => {
    const { source } = setup();
    act(() => source.fail(false));
    expect(useConnectionStore.getState().status).toBe('reconnecting');
    act(() => source.fail(true));
    expect(useConnectionStore.getState().status).toBe('closed');
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
});
