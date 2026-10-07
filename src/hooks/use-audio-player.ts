'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioPlayerState = {
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  currentTime: number;
  duration: number;
};

const INITIAL_STATE: AudioPlayerState = {
  isPlaying: false,
  isLoading: false,
  hasError: false,
  currentTime: 0,
  duration: 0,
};

const MEDIA_EVENTS = [
  'loadstart',
  'loadedmetadata',
  'durationchange',
  'canplay',
  'waiting',
  'playing',
  'play',
  'pause',
  'timeupdate',
  'seeked',
  'ended',
  'emptied',
  'error',
] as const;

function readState(audio: HTMLAudioElement): AudioPlayerState {
  return {
    isPlaying: !audio.paused && !audio.ended,
    isLoading:
      audio.networkState === HTMLMediaElement.NETWORK_LOADING &&
      audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA,
    hasError: audio.error !== null,
    currentTime: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
  };
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioPlayerState>(INITIAL_STATE);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const sync = () => setState(readState(audio));

    MEDIA_EVENTS.forEach((event) => audio.addEventListener(event, sync));

    return () => MEDIA_EVENTS.forEach((event) => audio.removeEventListener(event, sync));
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) return;

    try {
      await audio.play();
    } catch {
      setState(readState(audio));
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) {
      void play();
    } else {
      pause();
    }
  }, [pause, play]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;

    if (!audio || !Number.isFinite(audio.duration)) return;

    audio.currentTime = Math.min(Math.max(time, 0), audio.duration);
  }, []);

  return { audioRef, ...state, play, pause, toggle, seek };
}
