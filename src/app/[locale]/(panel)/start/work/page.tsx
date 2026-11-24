import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// Old link: what is on the shelf is on the Stock page.
export default function OldStartWork() {
  redirect(routes.stock());
}
