import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
  title?: string;
  message?: string;
  // Shown so a customer can quote it to the shop.
  requestId?: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ title, message, requestId, action, className }: ErrorStateProps) {
  const t = useTranslations('error');

  return (
    <div className={cn('empty', className)} role="alert">
      <Icon name="info" />
      <h2 className="empty-title">{title ?? t('title')}</h2>
      <p>{message ?? t('requestFailed')}</p>
      {requestId ? <p className="tiny">{t('reference', { id: requestId })}</p> : null}
      {action ? <div className="row">{action}</div> : null}
    </div>
  );
}
