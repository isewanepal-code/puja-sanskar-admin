'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';

import { ResourceForm, ResourceScreen } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/info-tip';
import { ItemGroups, ProductOffersPanel } from '@/features/marketing';
import { request } from '@/lib/api';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { gradesResource, pairingsResource, variantsResource } from '../resources';
import { BuyingPanel } from './buying-panel';
import { ItemEditPanel } from './item-edit-modal';
import { OptionsPanel } from './options-panel';
import { PhotosPanel } from './photos-panel';
import { PriceGrid } from './price-grid';
import { useProduct, type Product } from './use-product';

export const STEPS = ['basics', 'packs', 'prices', 'photos', 'buying', 'offers', 'more'] as const;
export type Step = (typeof STEPS)[number];

// What each step still needs, so the bar can say where the item stands.
function done(step: Step, product: Product): boolean {
  switch (step) {
    case 'basics':
      return true;
    case 'packs':
      return product.variants.length > 0;
    case 'prices':
      return product.variants.length > 0 && product.variants.every((v) => Number(v.price) > 0);
    case 'photos':
      return product.images.length > 0;
    case 'buying':
      return product.variants.some((v) => v.inStock || v.lastBought);
    default:
      return false;
  }
}

// The row of steps across the top: where you are, what is finished, and a click to go to any.
export function StepBar({
  current,
  onGo,
  product,
  locked = false,
}: {
  current: Step;
  onGo: (step: Step) => void;
  product?: Product;
  // Before the item exists only the first step can be opened.
  locked?: boolean;
}) {
  const t = useTranslations('itemPage');
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label={t('sections')}>
      {STEPS.map((step, index) => {
        const finished = product ? done(step, product) : false;
        const active = step === current;
        const disabled = locked && step !== 'basics';
        return (
          <li key={step} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              aria-current={active ? 'step' : undefined}
              onClick={() => onGo(step)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-[0.7rem]',
                  finished && !active
                    ? 'bg-success text-white'
                    : active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                )}
              >
                {finished && !active ? '✓' : index + 1}
              </span>
              {t(`step.${step}`)}
            </button>
            {index < STEPS.length - 1 ? (
              <span className="hidden h-px w-3 bg-border sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// What goes well with this item.
function PairsForm({ product }: { product: Product }) {
  const t = useTranslations('itemPage');
  const tf = useTranslations('forms');
  const formId = useId();
  const paired = useQuery({
    queryKey: ['products', 'pairings', product.id],
    queryFn: () => request<Product[]>('GET', `/admin/products/${product.id}/pairings`),
  });
  if (!paired.data) return <p className="text-sm text-muted-foreground">…</p>;
  return (
    <div className="grid gap-3">
      <ResourceForm
        resource={pairingsResource(product)}
        formId={formId}
        defaults={{ productIds: paired.data.map((other) => other.id) }}
        successMessage={t('pairsSaved')}
        onDone={() => undefined}
      />
      <div>
        <Button type="submit" form={formId}>
          {tf('save')}
        </Button>
      </div>
    </div>
  );
}

function Card({ title, help, children }: { title: string; help: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <InfoTip text={help} />
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

// One item, one step at a time: basics, packs, prices, photos, buying, offers. A click on a step
// goes there; Back and Next walk through them; nothing is far down a long page.
export function ItemPage({ id }: { id: string }) {
  const t = useTranslations('itemPage');
  const tg = useTranslations('itemGroups');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: product, isPending, isError } = useProduct(id);

  const asked = params.get('step') as Step | null;
  const step: Step = asked && STEPS.includes(asked) ? asked : 'basics';
  const go = (next: Step) => router.replace(`${pathname}?step=${next}`, { scroll: false });

  if (isPending) return <p className="text-sm text-muted-foreground">…</p>;
  if (isError || !product) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('notFound')}
      </p>
    );
  }

  const index = STEPS.indexOf(step);
  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <Link
          href={routes.products()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t('back')}
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold">
          {product.nameNe}
          <span className="text-base font-normal text-muted-foreground">{product.nameEn}</span>
          <Badge>{product.code}</Badge>
          {product.isActive ? (
            <Badge tone="success">{t('live')}</Badge>
          ) : (
            <Badge tone="warning">{t('hidden')}</Badge>
          )}
        </h1>
      </div>

      <StepBar current={step} onGo={go} product={product} />

      <Card title={t(`step.${step}`)} help={t(`help.${step}`)}>
        {step === 'basics' ? (
          <>
            <ItemEditPanel id={product.id} />
          </>
        ) : null}

        {step === 'packs' ? (
          <div className="grid gap-6">
            <OptionsPanel key={product.id} product={product} />
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">{t('morePacks')}</summary>
              <div className="mt-3">
                <ResourceScreen resource={variantsResource(product)} />
              </div>
            </details>
          </div>
        ) : null}

        {step === 'prices' ? <PriceGrid key={product.id} product={product} /> : null}
        {step === 'photos' ? <PhotosPanel product={product} /> : null}
        {step === 'buying' ? <BuyingPanel product={product} /> : null}

        {step === 'offers' ? (
          <ProductOffersPanel
            product={{
              id: product.id,
              nameNe: product.nameNe,
              variants: product.variants.map((v) => ({ id: v.id, label: v.label })),
            }}
          />
        ) : null}

        {step === 'more' ? (
          <div className="grid gap-8">
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">{tg('title')}</h3>
              <ItemGroups kind="product" id={product.id} />
            </div>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">{t('quality')}</h3>
              <p className="text-sm text-muted-foreground">{t('qualityNote')}</p>
              <ResourceScreen resource={gradesResource(product)} />
            </div>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">{t('goesWith')}</h3>
              <p className="text-sm text-muted-foreground">{t('goesWithNote')}</p>
              <PairsForm key={product.id} product={product} />
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="secondary" disabled={index === 0} onClick={() => go(STEPS[index - 1]!)}>
          ← {t('prev')}
        </Button>
        {index < STEPS.length - 1 ? (
          <Button onClick={() => go(STEPS[index + 1]!)}>
            {t('next', { step: t(`step.${STEPS[index + 1]!}`) })} →
          </Button>
        ) : (
          <Link
            href={routes.products()}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('finish')}
          </Link>
        )}
      </div>
    </div>
  );
}
