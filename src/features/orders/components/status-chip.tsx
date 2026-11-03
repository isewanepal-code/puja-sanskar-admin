import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { OrderStatus } from '../api/server';

const TONE: Record<OrderStatus, string> = {
  PENDING: 'chip-warning',
  CONFIRMED: 'chip-accent',
  PACKED: 'chip-accent',
  OUT_FOR_DELIVERY: 'chip-primary',
  READY_FOR_PICKUP: 'chip-primary',
  COMPLETED: 'chip-success',
  CANCELLED: '',
};

export function StatusChip({ status }: { status: OrderStatus }) {
  const t = useTranslations('orders.status');
  return <span className={cn('chip', TONE[status])}>{t(status)}</span>;
}
