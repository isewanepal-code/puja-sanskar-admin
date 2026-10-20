import type { ReactNode } from 'react';

import { Icon, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon = 'search',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('empty', className)}>
      <Icon name={icon} />
      <h2 className="empty-title">{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="row">{action}</div> : null}
    </div>
  );
}
