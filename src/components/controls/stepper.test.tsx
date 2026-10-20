import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { Stepper } from './stepper';

describe('Stepper', () => {
  it('steps within its bounds', async () => {
    const onChange = vi.fn();
    const { user } = render(<Stepper value={1} max={2} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Remove one' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add one' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('removes the line from the lowest count when it can', async () => {
    const onRemove = vi.fn();
    const { user } = render(<Stepper value={1} onChange={vi.fn()} onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
