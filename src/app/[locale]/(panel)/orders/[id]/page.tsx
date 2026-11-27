import type { Metadata } from 'next';

import { loadOrder, OrderDetail } from '@/features/orders';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/orders/[id]'>): Promise<Metadata> {
  const order = await loadOrder((await params).id);
  return { title: order.number };
}

export default function OrderPage({ params }: PageProps<'/[locale]/orders/[id]'>) {
  return <OrderDetail params={params} />;
}
