import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// Old link: sizes and prices are set on Set quantity and price.
export default function OldStartPrices() {
  redirect(routes.quantityPrice());
}
