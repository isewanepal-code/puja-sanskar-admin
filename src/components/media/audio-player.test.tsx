import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/render';

import { AudioPlayer } from './audio-player';

describe('AudioPlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockReturnValue();
  });

  it('starts playback when the play button is pressed', async () => {
    const { user } = render(<AudioPlayer src="/mantra.mp3" title="Gayatri Mantra" />);

    await user.click(screen.getByRole('button', { name: 'Play Gayatri Mantra' }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('reflects native playback state', () => {
    const { container } = render(<AudioPlayer src="/mantra.mp3" title="Gayatri Mantra" />);
    const audio = container.querySelector('audio')!;

    vi.spyOn(audio, 'paused', 'get').mockReturnValue(false);
    fireEvent.play(audio);

    expect(screen.getByRole('button', { name: 'Pause Gayatri Mantra' })).toBeInTheDocument();
  });

  it('disables seeking until duration is known', () => {
    render(<AudioPlayer src="/mantra.mp3" title="Gayatri Mantra" />);

    expect(screen.getByRole('slider', { name: 'Seek Gayatri Mantra' })).toBeDisabled();
  });
});
