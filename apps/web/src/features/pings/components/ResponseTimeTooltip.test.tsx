import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../../../lib/format';
import { ResponseTimeTooltipCard } from './ResponseTimeTooltip';

const epochMs = Date.parse('2026-09-24T10:00:00.000Z');

describe('ResponseTimeTooltipCard', () => {
  it('shows the date and the epoch in grey, and a successful ping in green with a tick', () => {
    render(<ResponseTimeTooltipCard point={{ epochMs, ms: 200, failedMs: null }} />);

    expect(screen.getByText(formatDateTime('2026-09-24T10:00:00.000Z'))).toHaveClass(
      'text-slate-600',
    );
    expect(screen.getByText(`Epoch (ms): ${epochMs}`)).toHaveClass('text-slate-600');
    expect(screen.getByRole('img', { name: 'Succeeded' })).toBeInTheDocument();
    expect(screen.getByText('Response time: 200 ms')).toHaveClass('text-emerald-700');
  });

  it('shows a failed ping in red with a cross, in the same units as the rest of the UI', () => {
    render(<ResponseTimeTooltipCard point={{ epochMs, ms: 1_240, failedMs: 1_240 }} />);

    expect(screen.getByRole('img', { name: 'Failed' })).toBeInTheDocument();
    expect(screen.getByText('Response time: 1.24 s')).toHaveClass('text-rose-700');
  });
});
