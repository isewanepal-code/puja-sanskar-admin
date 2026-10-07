import type { NextConfig } from 'next';

import { mediaConfig } from './src/config/media';

const nextConfig: NextConfig = {
  images: {
    formats: [...mediaConfig.image.formats],
    qualities: [...mediaConfig.image.qualities],
  },
};

export default nextConfig;
