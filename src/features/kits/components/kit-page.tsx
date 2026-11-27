'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { ResourceForm, useResourceText } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { StepTabs } from '@/components/navigation/step-tabs';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api';
import { routes } from '@/lib/routes';

import { kitPackResource, kitsResource, type Kit } from '../resources';
import { KitItemsEditor } from './kit-items-editor';
import { KitPriceSummary } from './kit-price-summary';
import { ActionModal } from '@/components/resource';
import { ItemGroups } from '@/features/marketing';

const STEPS = ['basics', 'items', 'packing'] as const;
type Step = (typeof STEPS)[number];

// One kit as a page: its details and photos, its items with the price they make, and how it is packed.
export function KitPage({ id }: { id: string }) {
  const t = useTranslations('kitEdit');
  const tf = useTranslations('forms');
  const tk = useResourceText('kits');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [packing, setPacking] = useState<'pack' | 'unpack' | null>(null);
  const ta = useTranslations('actions');
  const tg = useTranslations('itemGroups');
  const kit = useQuery({
    queryKey: ['kits', 'page', id],
    queryFn: () => request<Kit>('GET', `/admin/kits/${id}`),
  });

  const asked = params.get('step') as Step | null;
  const step: Step = asked && STEPS.includes(asked) ? asked : 'basics';
  const go = (next: Step) => router.replace(`${pathname}?step=${next}`, { scroll: false });

  if (kit.isPending) return <p className="text-sm text-muted-foreground">…</p>;
  if (kit.isError || !kit.data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('notFound')}
      </p>
    );
  }
  const data = kit.data;
  const resource = kitsResource(tk);

  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <Link href={routes.kits()} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('back')}
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold">
          {data.nameNe}
          <span className="text-base font-normal text-muted-foreground">{data.nameEn}</span>
          <Badge>{data.code}</Badge>
          {data.tier ? <Badge tone="info">{tk(`tiers.${data.tier}`)}</Badge> : null}
          {data.packed ? (
            <Badge tone="success">{t('packedBadge', { count: data.availableCount })}</Badge>
          ) : null}
        </h1>
      </div>

      <StepTabs
        steps={STEPS}
        current={step}
        onSelect={go}
        label={(name) => t(`step.${name}`)}
        ariaLabel={t('sections')}
      />

      <section className="rounded-xl border border-border bg-card p-5">
        {step === 'basics' ? (
          <>
            <ResourceForm
              key={data.id}
              resource={resource}
              row={data}
              formId={formId}
              onPendingChange={setSaving}
              onDone={() => undefined}
            />
            <div className="mt-4 flex justify-end">
              <Button type="submit" form={formId} disabled={saving}>
                {saving ? tf('saving') : tf('save')}
              </Button>
            </div>
            <div className="mt-5 grid gap-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">{tg('title')}</h3>
              <ItemGroups kind="kit" id={data.id} />
            </div>
          </>
        ) : null}
        {step === 'items' ? (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t('itemsNote')}</p>
            <KitPriceSummary kitId={data.id} />
            <KitItemsEditor kitId={data.id} />
          </div>
        ) : null}
        {step === 'packing' ? (
          <div className="grid gap-3">
            {data.packed ? (
              <>
                <p className="text-sm">{t('packedNote', { count: data.availableCount })}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setPacking('pack')}>{ta('packKits')}</Button>
                  <Button variant="secondary" onClick={() => setPacking('unpack')}>
                    {ta('unpackKits')}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('notPacked')}</p>
            )}
          </div>
        ) : null}
      </section>

      <ActionModal
        resource={packing ? kitPackResource(data, packing) : null}
        size="xs"
        title={ta(packing === 'unpack' ? 'unpackKitsOf' : 'packKitsOf', { name: data.nameNe })}
        description={ta(packing === 'unpack' ? 'unpackKitsNote' : 'packKitsNote')}
        submitLabel={ta(packing === 'unpack' ? 'unpackKits' : 'packKits')}
        doneMessage={ta(packing === 'unpack' ? 'kitsUnpacked' : 'kitsPacked')}
        onClose={() => {
          setPacking(null);
          void kit.refetch();
        }}
      />
    </div>
  );
}
