import type { components, paths } from './schema';

export type { paths };

// Response and request shapes by their API name: Schema<'ProductDetailResponse'>.
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];
