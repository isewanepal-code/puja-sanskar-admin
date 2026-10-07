import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('announces the error with default copy', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('renders a custom action', () => {
    render(<ErrorState action={<button type="button">Retry</button>} />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
