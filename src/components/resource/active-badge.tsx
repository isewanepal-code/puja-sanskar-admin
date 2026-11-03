import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';

// Whether a record shows on the website.
export function ActiveBadge({ on }: { on: boolean }) {
  const t = useTranslations('table');
  return <Badge tone={on ? 'success' : 'neutral'}>{on ? t('on') : t('off')}</Badge>;
}
