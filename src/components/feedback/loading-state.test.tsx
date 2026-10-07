import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { LoadingState } from './loading-state';

describe('LoadingState', () => {
  it('exposes a polite status with its label', () => {
    render(<LoadingState label="Loading pujas" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading pujas');
  });
});
