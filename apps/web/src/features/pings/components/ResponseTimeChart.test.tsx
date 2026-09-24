import { act, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithClient } from '../../../test/render';
import { API, server } from '../../../test/server';
import { pingKeys } from '../query-keys';
import { ResponseTimeChart } from './ResponseTimeChart';

describe('ResponseTimeChart', () => {
  it('explains when the window has no data', async () => {
    server.use(
      http.get(`${API}/api/pings/series`, () => HttpResponse.json({ window: '1h', points: [] })),
    );
    renderWithClient(<ResponseTimeChart window="1h" />);
    expect(await screen.findByText('No pings in this window yet')).toBeInTheDocument();
  });

  it('renders a labelled chart region when data exists', async () => {
    server.use(
      http.get(`${API}/api/pings/series`, () =>
        HttpResponse.json({
          window: '1h',
          points: [{ t: '2026-09-24T10:00:00.000Z', ms: 200, ok: true }],
        }),
      ),
    );
    renderWithClient(<ResponseTimeChart window="1h" />);
    expect(
      await screen.findByRole('figure', { name: 'Response time, last 1h' }),
    ).toBeInTheDocument();
  });

  it('shows an error state when the series fails', async () => {
    server.use(http.get(`${API}/api/pings/series`, () => HttpResponse.error()));
    renderWithClient(<ResponseTimeChart window="1h" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('keeps showing the chart and adds an inline notice when a background refresh fails', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/pings/series`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({
              window: '1h',
              points: [{ t: '2026-09-24T10:00:00.000Z', ms: 200, ok: true }],
            })
          : HttpResponse.error();
      }),
    );
    const { queryClient } = renderWithClient(<ResponseTimeChart window="1h" />);
    expect(
      await screen.findByRole('figure', { name: 'Response time, last 1h' }),
    ).toBeInTheDocument();

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: pingKeys.series('1h') });
    });

    expect(screen.getByRole('figure', { name: 'Response time, last 1h' })).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't refresh — showing the last loaded data");
  });
});
