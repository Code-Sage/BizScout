import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeStats } from '../../../test/fixtures';
import { renderWithClient } from '../../../test/render';
import { API, server } from '../../../test/server';
import { pingKeys } from '../query-keys';
import { StatsCards } from './StatsCards';

describe('StatsCards', () => {
  it('shows success rate, latency and last ping', async () => {
    server.use(http.get(`${API}/api/pings/stats`, () => HttpResponse.json(makeStats())));
    renderWithClient(<StatsCards window="24h" />);

    expect(await screen.findByText('98.9%')).toBeInTheDocument();
    expect(screen.getByText('285/288 pings')).toBeInTheDocument();
    expect(screen.getByText('312 ms')).toBeInTheDocument();
    expect(screen.getByText('640 ms')).toBeInTheDocument();
  });

  it('handles a window with no data', async () => {
    server.use(
      http.get(`${API}/api/pings/stats`, () =>
        HttpResponse.json(
          makeStats({
            total: 0,
            successCount: 0,
            failureCount: 0,
            successRate: null,
            avgMs: null,
            p50Ms: null,
            p95Ms: null,
            p99Ms: null,
            minMs: null,
            maxMs: null,
            lastPingAt: null,
          }),
        ),
      ),
    );
    renderWithClient(<StatsCards window="1h" />);
    expect(await screen.findByText('Never')).toBeInTheDocument();
  });

  it('shows an error state when stats fail to load', async () => {
    server.use(http.get(`${API}/api/pings/stats`, () => HttpResponse.error()));
    renderWithClient(<StatsCards window="24h" />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load statistics");
  });

  it('keeps showing cached stats and adds an inline notice when a background refresh fails', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/pings/stats`, () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json(makeStats()) : HttpResponse.error();
      }),
    );
    const { queryClient } = renderWithClient(<StatsCards window="24h" />);
    expect(await screen.findByText('98.9%')).toBeInTheDocument();

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: pingKeys.stats('24h') });
    });

    // The stale data is still there...
    expect(screen.getByText('98.9%')).toBeInTheDocument();
    // ...alongside a small notice, not a full-panel error replacing it.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't refresh — showing the last loaded data");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
