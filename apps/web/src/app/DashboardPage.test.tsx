import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { makePing, makeStats } from '../test/fixtures';
import { MockEventSource, mockEventSourceFactory } from '../test/mock-event-source';
import { renderWithClient } from '../test/render';
import { API, server } from '../test/server';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    MockEventSource.reset();
    server.use(
      http.get(`${API}/api/pings/stats`, () => HttpResponse.json(makeStats())),
      http.get(`${API}/api/pings/series`, () => HttpResponse.json({ window: '24h', points: [] })),
      http.get(`${API}/api/pings`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        const data =
          status === 'failure'
            ? [makePing({ id: 9, ok: false, statusCode: 502, errorCode: 'HTTP_ERROR' })]
            : [makePing({ id: 10 }), makePing({ id: 9, ok: false, statusCode: 502 })];
        return HttpResponse.json({ data, nextCursor: null });
      }),
      http.get(`${API}/api/pings/10`, () =>
        HttpResponse.json({
          ...makePing({ id: 10 }),
          requestPayload: { event: 'listing.viewed' },
          responseHeaders: null,
          responseBody: null,
        }),
      ),
    );
  });

  it('renders overview and responses and opens the live stream', async () => {
    renderWithClient(<DashboardPage eventSourceFactory={mockEventSourceFactory} />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(await screen.findAllByTestId('ping-row')).toHaveLength(2);
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it('filters to failures', async () => {
    const { user } = renderWithClient(
      <DashboardPage eventSourceFactory={mockEventSourceFactory} />,
    );
    await screen.findAllByTestId('ping-row');

    await user.click(screen.getByRole('radio', { name: 'Failures' }));

    const rows = await screen.findAllByTestId('ping-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByLabelText('Failure, HTTP 502')).toBeInTheDocument();
  });

  it('opens and closes the detail drawer', async () => {
    const { user } = renderWithClient(
      <DashboardPage eventSourceFactory={mockEventSourceFactory} />,
    );
    const [first] = await screen.findAllByTestId('ping-row');

    await user.click(within(first!).getByRole('button'));
    expect(await screen.findByRole('dialog', { name: 'Ping #10' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
