'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';

import { ActionModal, ResourceForm, ResourceScreen, useResourceText } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants, IconButton } from '@/components/ui/button';
import { groupChoices } from '@/features/puja-groups';
import { request, type Schema } from '@/lib/api';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { requirementsResource, verifyResource } from '../requirements';
import { pujasResource } from '../resource';
import type { Puja } from '../types';

type Requirement = Schema<'AdminRequirementResponse'>;
const STEPS = ['details', 'samagri'] as const;
type Step = (typeof STEPS)[number];

function usePujaResource() {
  const t = useResourceText('pujas');
  const groups = useQuery({
    queryKey: ['options', groupChoices.key],
    queryFn: groupChoices.load,
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(() => {
    const names = new Map((groups.data ?? []).map((option) => [option.value, option.label.trim()]));
    return pujasResource(
      (id) => names.get(id),
      (kind) => t(`kinds.${kind}`),
    );
  }, [groups.data, t]);
}

// Add a puja on a page of its own; once saved, its page opens to fill in the samagri list.
export function NewPujaPage() {
  const t = useTranslations('pujaPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const resource = usePujaResource();
  const formId = useId();
  const [saving, setSaving] = useState(false);
  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <Link href={routes.pujas()} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('back')}
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-semibold">{t('newTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('newNote')}</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-5">
        <ResourceForm
          resource={resource}
          formId={formId}
          onPendingChange={setSaving}
          onDone={(saved) => {
            const id = (saved as { id?: string } | undefined)?.id;
            router.push(id ? `${routes.puja(id)}?step=samagri` : routes.pujas());
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Link href={routes.pujas()} className={buttonVariants({ variant: 'secondary' })}>
            {tf('cancel')}
          </Link>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? tf('saving') : tf('create')}
          </Button>
        </div>
      </section>
    </div>
  );
}

// One puja as a page: its details, and its samagri list (what the puja needs) right under it.
export function PujaPage({ id }: { id: string }) {
  const t = useTranslations('pujaPage');
  const tf = useTranslations('forms');
  const ta = useTranslations('actions');
  const tr = useResourceText('requirements');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const formId = useId();
  const resource = usePujaResource();
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<Requirement | null>(null);
  const puja = useQuery({
    queryKey: ['pujas', 'page', id],
    queryFn: () => request<Puja>('GET', `/admin/pujas/${id}`),
  });
  const asked = params.get('step') as Step | null;
  const step: Step = asked && STEPS.includes(asked) ? asked : 'details';
  const go = (next: Step) => router.replace(`${pathname}?step=${next}`, { scroll: false });

  if (puja.isPending) return <p className="text-sm text-muted-foreground">…</p>;
  if (puja.isError || !puja.data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('notFound')}
      </p>
    );
  }
  const data = puja.data;
  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <Link href={routes.pujas()} className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('back')}
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold">
          {data.nameNe}
          <span className="text-base font-normal text-muted-foreground">{data.nameEn}</span>
          <Badge>{data.code}</Badge>
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ol className="flex flex-wrap items-center gap-1.5" aria-label={t('sections')}>
          {STEPS.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                aria-current={step === name ? 'step' : undefined}
                onClick={() => go(name)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium',
                  step === name
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="grid size-5 place-items-center rounded-full bg-muted text-[0.7rem]">
                  {index + 1}
                </span>
                {t(`step.${name}`)}
              </button>
            </li>
          ))}
        </ol>
        <Link href={routes.newKit(data.id)} className={buttonVariants({ variant: 'secondary' })}>
          {ta('makeKitOfPuja')}
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        {step === 'details' ? (
          <>
            <ResourceForm
              key={data.id}
              resource={resource}
              row={data}
              formId={formId}
              onPendingChange={setSaving}
              onDone={() => void puja.refetch()}
            />
            <div className="mt-4 flex justify-end">
              <Button type="submit" form={formId} disabled={saving}>
                {saving ? tf('saving') : tf('save')}
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{t('samagriNote')}</p>
            <ResourceScreen
              resource={requirementsResource(data.id, tr)}
              rowActions={(row) => (
                <IconButton icon="shield" label={ta('verify')} onClick={() => setVerifying(row)} />
              )}
            />
          </div>
        )}
      </section>

      <ActionModal
        resource={verifying ? verifyResource(data.id, verifying, tr) : null}
        title={ta('verifyFor', { name: verifying?.material.nameNe ?? '' })}
        description={ta('verifyNote')}
        submitLabel={ta('verify')}
        doneMessage={ta('verified')}
        onClose={() => setVerifying(null)}
      />
    </div>
  );
}
