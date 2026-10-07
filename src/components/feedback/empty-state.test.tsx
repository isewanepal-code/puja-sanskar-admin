import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/render';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title and optional description', () => {
    render(<EmptyState title="Nothing here" description="Try again later." />);

    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('Try again later.')).toBeInTheDocument();
  });
});
