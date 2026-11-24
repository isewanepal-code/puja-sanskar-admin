import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// Old link: buying is the Buy page.
export default function OldStartBuy() {
  redirect(routes.buy());
}
