export const mediaConfig = {
  image: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
    sizes: {
      full: '100vw',
      half: '(min-width: 1024px) 50vw, 100vw',
      card: '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw',
      thumbnail: '96px',
    },
  },
} as const;

export type ImageSizePreset = keyof typeof mediaConfig.image.sizes;
