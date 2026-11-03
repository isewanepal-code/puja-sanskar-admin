import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';

import type { OrderStatus } from '../resources';

const TONE = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PACKED: 'info',
  OUT_FOR_DELIVERY: 'info',
  READY_FOR_PICKUP: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
} as const satisfies Record<OrderStatus, string>;

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('orders.status');
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
