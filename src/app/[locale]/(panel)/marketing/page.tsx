import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// Marketing opens on its offers.
export default function MarketingPage() {
  redirect(routes.offers());
}
