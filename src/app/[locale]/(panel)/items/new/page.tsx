import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// Old link: adding an item is the Add item page.
export default function OldNewItem() {
  redirect(routes.addItem());
}
