import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { makePing, makeStats } from '../../test/fixtures';
import { createTestQueryClient } from '../../test/render';
import { API, server } from '../../test/server';
import { usePingDetail, usePings, usePingStats } from './hooks';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

describe('usePings', () => {
  it('requests the first page with the filter and follows the cursor', async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${API}/api/pings`, ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.search);
        return url.searchParams.get('cursor')
          ? HttpResponse.json({ data: [makePing({ id: 1 })], nextCursor: null })
          : HttpResponse.json({ data: [makePing({ id: 2 })], nextCursor: 2 });
      }),
    );

    const { result } = renderHook(() => usePings('failure'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    expect(seen).toEqual(['?limit=25&status=failure', '?limit=25&status=failure&cursor=2']);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('usePingStats', () => {
  it('loads stats for the window', async () => {
    server.use(
      http.get(`${API}/api/pings/stats`, ({ request }) =>
        HttpResponse.json(
          makeStats({ window: new URL(request.url).searchParams.get('window') as '1h' }),
        ),
      ),
    );
    const { result } = renderHook(() => usePingStats('1h'), { wrapper });
    await waitFor(() => expect(result.current.data?.window).toBe('1h'));
  });
});

describe('usePingDetail', () => {
  it('stays idle without an id', () => {
    const { result } = renderHook(() => usePingDetail(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
