import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api-client';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { JsonBlock } from './JsonBlock';
import { SegmentedControl } from './SegmentedControl';

describe('ErrorState', () => {
  it('announces the error and offers a retry', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Couldn't load"
        error={new ApiError('API down', 503, 'X')}
        onRetry={onRetry}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load");
    expect(alert).toHaveTextContent('API down');

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides the retry button when there is nothing to retry', () => {
    render(<ErrorState error={new Error('x')} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No responses yet" description="Soon." />);
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
    expect(screen.getByText('Soon.')).toBeInTheDocument();
  });
});

describe('SegmentedControl', () => {
  it('exposes options as radios and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Window"
        options={['1h', '24h'] as const}
        value="1h"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Window' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '1h' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('radio', { name: '24h' }));
    expect(onChange).toHaveBeenCalledWith('24h');
  });
});

describe('JsonBlock', () => {
  it('pretty-prints JSON under a heading', () => {
    render(<JsonBlock title="Request payload" value={{ a: 1 }} />);
    expect(screen.getByRole('heading', { name: 'Request payload' })).toBeInTheDocument();
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });
});
