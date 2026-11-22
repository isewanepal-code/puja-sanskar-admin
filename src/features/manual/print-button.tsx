'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

// Prints the manual, or saves it as a PDF to share.
export function PrintButton() {
  const t = useTranslations('manual');
  return (
    <Button
      variant="secondary"
      icon="download"
      onClick={() => window.print()}
      className="print:hidden"
    >
      {t('print')}
    </Button>
  );
}
