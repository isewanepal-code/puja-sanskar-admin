'use client';

import { Loader2, Pause, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { formatDuration } from '@/lib/media';
import { cn } from '@/lib/utils';

type AudioPlayerProps = {
  src: string;
  title: string;
  loop?: boolean;
  className?: string;
};

export function AudioPlayer({ src, title, loop = false, className }: AudioPlayerProps) {
  const { audioRef, isPlaying, isLoading, hasError, currentTime, duration, toggle, seek } =
    useAudioPlayer();

  return (
    <div role="group" aria-label={title} className={cn('flex items-center gap-3', className)}>
      <audio ref={audioRef} src={src} loop={loop} preload="metadata" />

      <Button
        size="icon"
        variant="outline"
        onClick={toggle}
        disabled={hasError}
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : isPlaying ? (
          <Pause aria-hidden="true" />
        ) : (
          <Play aria-hidden="true" />
        )}
      </Button>

      <input
        type="range"
        min={0}
        max={duration}
        step="any"
        value={currentTime}
        onChange={(event) => seek(Number(event.target.value))}
        disabled={hasError || duration === 0}
        aria-label={`Seek ${title}`}
        aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
        className="h-1 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed"
      />

      {hasError ? (
        <span role="alert" className="text-xs text-destructive">
          Audio unavailable
        </span>
      ) : (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
