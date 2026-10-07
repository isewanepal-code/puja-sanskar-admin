import { describe, expect, it } from 'vitest';

import { mediaConfig } from '@/config/media';
import { render, screen } from '@/test/render';

import { MediaImage } from './media-image';

describe('MediaImage', () => {
  it('applies the size preset and aspect ratio', () => {
    render(<MediaImage src="/sample.jpg" alt="Sample" size="card" aspectRatio="4/3" />);

    const image = screen.getByRole('img', { name: 'Sample' });

    expect(image).toHaveAttribute('sizes', mediaConfig.image.sizes.card);
    expect(image.parentElement).toHaveStyle({ aspectRatio: '4/3' });
  });
});
