import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStats } from '../test/fixtures';
import { MockEventSource } from '../test/mock-event-source';
import { API, server } from '../test/server';
import { App } from './App';

describe('App', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the dashboard inside the providers', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    server.use(
      http.get(`${API}/api/pings/stats`, () => HttpResponse.json(makeStats())),
      http.get(`${API}/api/pings/series`, () => HttpResponse.json({ window: '24h', points: [] })),
      http.get(`${API}/api/pings`, () => HttpResponse.json({ data: [], nextCursor: null })),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: 'BizScout Uptime Monitor' })).toBeInTheDocument();
    expect(await screen.findByText('No responses yet')).toBeInTheDocument();
  });
});
