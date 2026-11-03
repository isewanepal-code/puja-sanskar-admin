'use client';

import { Loader2, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('audio');
  const { audioRef, isPlaying, isLoading, hasError, currentTime, duration, toggle, seek } =
    useAudioPlayer();

  return (
    <div role="group" aria-label={title} className={cn('flex items-center gap-3', className)}>
      <audio ref={audioRef} src={src} loop={loop} preload="metadata" />

      <Button
        size="icon"
        variant="secondary"
        onClick={toggle}
        disabled={hasError}
        aria-label={isPlaying ? t('pause', { title }) : t('play', { title })}
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
        aria-label={t('seek', { title })}
        aria-valuetext={t('progress', {
          current: formatDuration(currentTime),
          total: formatDuration(duration),
        })}
        className="h-1 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed"
      />

      {hasError ? (
        <span role="alert" className="text-xs text-destructive">
          {t('unavailable')}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
