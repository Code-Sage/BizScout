import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { makePing } from '../../../test/fixtures';
import { renderWithClient } from '../../../test/render';
import { API, server } from '../../../test/server';
import { applyPingToCache } from '../cache';
import { PingTable } from './PingTable';

const pingsHandler = (pages: Record<string, { ids: number[]; next: number | null }>) =>
  http.get(`${API}/api/pings`, ({ request }) => {
    const cursor = new URL(request.url).searchParams.get('cursor') ?? 'first';
    const page = pages[cursor] ?? { ids: [], next: null };
    return HttpResponse.json({
      data: page.ids.map((id) => makePing({ id, payloadEvent: `event.${id}` })),
      nextCursor: page.next,
    });
  });

describe('PingTable', () => {
  it('shows a loading skeleton, then rows newest first', async () => {
    server.use(pingsHandler({ first: { ids: [3, 2, 1], next: null } }));
    renderWithClient(<PingTable status="all" onSelect={vi.fn()} />);

    expect(screen.getByTestId('ping-table-skeleton')).toBeInTheDocument();
    const rows = await screen.findAllByTestId('ping-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('event.3')).toBeInTheDocument();
  });

  it('shows an empty state when there is no data', async () => {
    server.use(pingsHandler({ first: { ids: [], next: null } }));
    renderWithClient(<PingTable status="all" onSelect={vi.fn()} />);
    expect(await screen.findByText('No responses yet')).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/pings`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Boom' } },
              { status: 500 },
            )
          : HttpResponse.json({ data: [makePing({ id: 1 })], nextCursor: null });
      }),
    );
    const { user } = renderWithClient(<PingTable status="all" onSelect={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByTestId('ping-row')).toHaveLength(1);
  });

  it('loads older pages on demand', async () => {
    server.use(pingsHandler({ first: { ids: [4, 3], next: 3 }, '3': { ids: [2, 1], next: null } }));
    const { user } = renderWithClient(<PingTable status="all" onSelect={vi.fn()} />);
    await screen.findAllByTestId('ping-row');

    await user.click(screen.getByRole('button', { name: 'Load older responses' }));

    expect(await screen.findAllByTestId('ping-row')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Load older responses' })).not.toBeInTheDocument();
  });

  it('opens a ping when its time is activated', async () => {
    server.use(pingsHandler({ first: { ids: [7], next: null } }));
    const onSelect = vi.fn();
    const { user } = renderWithClient(<PingTable status="all" onSelect={onSelect} />);

    const [row] = await screen.findAllByTestId('ping-row');
    await user.click(within(row!).getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it('highlights rows that arrive live but not the initial ones', async () => {
    server.use(pingsHandler({ first: { ids: [1], next: null } }));
    const { queryClient } = renderWithClient(<PingTable status="all" onSelect={vi.fn()} />);
    await screen.findAllByTestId('ping-row');

    act(() => applyPingToCache(queryClient, makePing({ id: 2 })));

    // Freshness is computed in an effect, one render after the row appears.
    await waitFor(() =>
      expect(screen.getAllByTestId('ping-row')[0]).toHaveAttribute('data-fresh', 'true'),
    );
    expect(screen.getAllByTestId('ping-row')[1]).toHaveAttribute('data-fresh', 'false');
  });
});
