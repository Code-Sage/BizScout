import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useConnectionStore } from './connection-store';
import { LiveIndicator } from './LiveIndicator';

describe('LiveIndicator', () => {
  it.each([
    ['connecting', 'Connecting…'],
    ['open', 'Live'],
    ['reconnecting', 'Reconnecting…'],
    ['closed', 'Offline'],
  ] as const)('shows %s as "%s"', (status, label) => {
    act(() => useConnectionStore.setState({ status }));
    render(<LiveIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('only pulses the live dot when the user has not requested reduced motion', () => {
    act(() => useConnectionStore.setState({ status: 'open' }));
    const { container } = render(<LiveIndicator />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toHaveClass('motion-safe:animate-pulse');
    expect(dot).not.toHaveClass('animate-pulse');
  });
});
