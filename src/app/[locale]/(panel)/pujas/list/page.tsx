import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// The old address of the list of pujas.
export default function OldPujaList() {
  redirect(routes.pujas());
}
