import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makePingDetail } from '../../../test/fixtures';
import { renderWithClient } from '../../../test/render';
import { API, server } from '../../../test/server';
import { PingDetailDrawer } from './PingDetailDrawer';

/** Minimal harness: a trigger button that opens the drawer, like a table row would. */
function Harness({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        {`Open ping ${id}`}
      </button>
      {open && <PingDetailDrawer id={id} onClose={() => setOpen(false)} />}
    </div>
  );
}

describe('PingDetailDrawer', () => {
  it('shows the request payload and response for the ping', async () => {
    server.use(
      http.get(`${API}/api/pings/5`, () =>
        HttpResponse.json(makePingDetail({ id: 5, errorMessage: 'HTTP 503 Service Unavailable' })),
      ),
    );
    renderWithClient(<PingDetailDrawer id={5} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Ping #5' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Request payload' })).toBeInTheDocument();
    expect(screen.getByText(/"requestId": "req_0000abcd"/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Response body' })).toBeInTheDocument();
    expect(screen.getByText('HTTP 503 Service Unavailable')).toBeInTheDocument();
  });

  it('moves focus to the close button and closes on Escape', async () => {
    server.use(http.get(`${API}/api/pings/5`, () => HttpResponse.json(makePingDetail({ id: 5 }))));
    const onClose = vi.fn();
    const { user } = renderWithClient(<PingDetailDrawer id={5} onClose={onClose} />);

    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the backdrop is clicked', async () => {
    server.use(http.get(`${API}/api/pings/5`, () => HttpResponse.json(makePingDetail({ id: 5 }))));
    const onClose = vi.fn();
    const { user } = renderWithClient(<PingDetailDrawer id={5} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows an error for a missing ping', async () => {
    server.use(
      http.get(`${API}/api/pings/5`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Ping 5 not found' } },
          { status: 404 },
        ),
      ),
    );
    renderWithClient(<PingDetailDrawer id={5} onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ping 5 not found');
  });

  it('returns focus to the element that opened it, once it unmounts', async () => {
    server.use(http.get(`${API}/api/pings/5`, () => HttpResponse.json(makePingDetail({ id: 5 }))));
    const { user } = renderWithClient(<Harness id={5} />);

    const trigger = screen.getByRole('button', { name: 'Open ping 5' });
    await user.click(trigger);
    expect(await screen.findByRole('button', { name: 'Close' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps Tab within the dialog, cycling between its focusable elements', async () => {
    server.use(
      http.get(`${API}/api/pings/5`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Ping 5 not found' } },
          { status: 404 },
        ),
      ),
    );
    const { user } = renderWithClient(<Harness id={5} />);
    await user.click(screen.getByRole('button', { name: 'Open ping 5' }));

    const closeButton = await screen.findByRole('button', { name: 'Close' });
    expect(closeButton).toHaveFocus();
    await screen.findByRole('alert');
    const retryButton = screen.getByRole('button', { name: 'Try again' });

    // Forward from the last focusable element wraps to the first.
    await user.tab();
    expect(retryButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Backward from the first focusable element wraps to the last.
    await user.tab({ shift: true });
    expect(retryButton).toHaveFocus();
  });
});
