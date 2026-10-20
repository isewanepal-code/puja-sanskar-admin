import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type ContainerProps = ComponentProps<'div'>;

export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn('container', className)} {...props} />;
}
