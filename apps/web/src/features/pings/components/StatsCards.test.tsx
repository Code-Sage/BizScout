import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeStats } from '../../../test/fixtures';
import { renderWithClient } from '../../../test/render';
import { API, server } from '../../../test/server';
import { StatsCards } from './StatsCards';

describe('StatsCards', () => {
  it('shows success rate, latency and last ping', async () => {
    server.use(http.get(`${API}/api/pings/stats`, () => HttpResponse.json(makeStats())));
    renderWithClient(<StatsCards window="24h" />);

    expect(await screen.findByText('99.0%')).toBeInTheDocument();
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
});
