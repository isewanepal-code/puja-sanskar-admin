'use client';

import { useTranslations } from 'next-intl';

import { WorkbookUploadButton } from '@/components/resource';

// One Excel for pujas (in nested groups), their samagri, kits and item groups, offered on each of
// those pages: download it, add rows, upload it back.
export function CatalogueSheetBar() {
  const t = useTranslations('catalogueSheet');
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
      <span>{t('hint')}</span>
      <WorkbookUploadButton
        path="/admin/catalogue-sheet"
        templatePath="/admin/catalogue-sheet"
        title={t('title')}
        description={t('note')}
        refresh={['pujas', 'pujaGroups', 'kits', 'priceGroups', 'products']}
      />
    </div>
  );
}
