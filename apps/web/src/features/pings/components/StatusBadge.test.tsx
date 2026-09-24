import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makePing } from '../../../test/fixtures';
import { LatencyValue } from './LatencyValue';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('shows the status code for successes', () => {
    render(<StatusBadge ping={makePing({ statusCode: 200 })} />);
    expect(screen.getByLabelText('Success, HTTP 200')).toHaveTextContent('200');
  });

  it('shows the status code for HTTP failures', () => {
    render(
      <StatusBadge ping={makePing({ ok: false, statusCode: 503, errorCode: 'HTTP_ERROR' })} />,
    );
    expect(screen.getByLabelText('Failure, HTTP 503')).toHaveTextContent('503');
  });

  it('names the failure when there is no status code', () => {
    render(<StatusBadge ping={makePing({ ok: false, statusCode: null, errorCode: 'TIMEOUT' })} />);
    expect(screen.getByLabelText('Failure, Timeout')).toHaveTextContent('Timeout');
  });
});

describe('LatencyValue', () => {
  it('formats and tones the latency', () => {
    render(<LatencyValue ms={2_400} />);
    expect(screen.getByText('2.40 s')).toHaveAttribute('data-tone', 'slow');
  });
});
