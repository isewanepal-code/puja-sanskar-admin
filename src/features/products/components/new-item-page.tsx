'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Icon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { choices } from '@/lib/choices';

import { ResourceForm } from '@/components/resource';
import { Button, IconButton } from '@/components/ui/button';
import { routes } from '@/lib/routes';

import { bareItemResource, quickItemResource } from '../resources';
import { StepBar } from './item-page';

// A new item: its name, how it is sold, the first pack and its price, and the stock that came in.
// The rest (colours, photos, offers) is done on the item's own page, which opens when this is saved.
function FullNewItemPage() {
  const t = useTranslations('itemPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState<Array<{ amount: string; unitId: string; price: string }>>([]);
  const [buying, setBuying] = useState(false);
  const [buy, setBuy] = useState({ amount: '', unitId: '', label: '' });
  const changeMore = (index: number, patch: Partial<(typeof more)[number]>) =>
    setMore((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  // The extra packs and the bag it is bought in ride along with the form.
  const extraBody = {
    morePacks: more
      .filter((row) => Number(row.amount) > 0 && row.unitId && Number(row.price) > 0)
      .map((row) => ({
        packQuantity: Number(row.amount),
        packUnitId: row.unitId,
        price: row.price,
      })),
    ...(buying && Number(buy.amount) > 0 && buy.unitId
      ? {
          buyPack: {
            packQuantity: Number(buy.amount),
            packUnitId: buy.unitId,
            ...(buy.label.trim() && { packLabel: buy.label.trim() }),
          },
        }
      : {}),
  };

  return (
    <div className="grid max-w-5xl gap-6">
      <div>
        <Link
          href={routes.products()}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t('back')}
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-semibold">{t('newTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('newNote')}</p>
      </div>
      <StepBar current="basics" onGo={() => undefined} locked />
      <section className="rounded-xl border border-border bg-card p-5">
        <ResourceForm
          resource={quickItemResource}
          formId={formId}
          extraBody={extraBody}
          onPendingChange={setSaving}
          onDone={(saved) => {
            const id = (saved as { id?: string } | undefined)?.id;
            router.push(id ? `${routes.item(id)}?step=packs` : routes.products());
          }}
        />
        <div className="mt-6 grid gap-3 border-t border-border pt-5">
          <div>
            <h2 className="text-sm font-semibold">{t('morePacks')}</h2>
            <p className="text-xs text-muted-foreground">{t('morePacksNote')}</p>
          </div>
          {more.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_2.5rem] items-end gap-2">
              <label className="grid gap-1 text-xs">
                {t('amount')}
                <Input
                  inputMode="decimal"
                  value={row.amount}
                  placeholder="250"
                  onChange={(e) => changeMore(index, { amount: e.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs">
                {t('unit')}
                <SearchSelect
                  aria-label={t('unit')}
                  source={choices.units}
                  value={row.unitId}
                  onChange={(value) => changeMore(index, { unitId: String(value) })}
                />
              </label>
              <label className="grid gap-1 text-xs">
                {t('price')}
                <Input
                  inputMode="decimal"
                  value={row.price}
                  placeholder="40"
                  onChange={(e) => changeMore(index, { price: e.target.value })}
                />
              </label>
              <IconButton
                icon="trash"
                variant="danger"
                label={t('removePack')}
                onClick={() => setMore((rows) => rows.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMore((rows) => [...rows, { amount: '', unitId: '', price: '' }])}
            >
              <Icon name="plus" size={14} />
              {t('addPack')}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-border pt-5">
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={buying}
              onChange={(e) => setBuying(e.target.checked)}
              className="size-4"
            />
            {t('buyBigger')}
          </label>
          <p className="text-xs text-muted-foreground">{t('buyBiggerNote')}</p>
          {buying ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1 text-xs">
                {t('buyAmount')}
                <Input
                  inputMode="decimal"
                  value={buy.amount}
                  placeholder="25000"
                  onChange={(e) => setBuy({ ...buy, amount: e.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs">
                {t('unit')}
                <SearchSelect
                  aria-label={t('unit')}
                  source={choices.units}
                  value={buy.unitId}
                  onChange={(value) => setBuy({ ...buy, unitId: String(value) })}
                />
              </label>
              <label className="grid gap-1 text-xs">
                {t('buyName')}
                <Input
                  value={buy.label}
                  placeholder="25 kg bag"
                  maxLength={80}
                  onChange={(e) => setBuy({ ...buy, label: e.target.value })}
                />
              </label>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Link
            href={routes.products()}
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3.5 text-sm font-medium hover:bg-muted"
          >
            {tf('cancel')}
          </Link>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? tf('saving') : t('createItem')}
          </Button>
        </div>
      </section>
    </div>
  );
}

// Step 1: just the item. Saving it shows what to do next.
export function BareItemPage() {
  const t = useTranslations('itemPage');
  const tf = useTranslations('forms');
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [sameName, setSameName] = useState(false);

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-sm text-muted-foreground">{t('bareNote')}</p>
      {saved !== null ? (
        <section className="grid gap-3 rounded-xl border border-border bg-card p-5">
          <p className="font-semibold">{t('bareSaved', { name: saved })}</p>
          <p className="text-sm text-muted-foreground">{t('bareNext')}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={routes.newPurchase()}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('goBuy')}
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setSaved(null);
                setRound((n) => n + 1);
              }}
            >
              {t('addAnother')}
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5">
          <ResourceForm
            key={round}
            resource={bareItemResource}
            formId={formId}
            extraBody={sameName ? { allowDuplicateName: true } : undefined}
            onPendingChange={setSaving}
            onDone={(item) => setSaved((item as { nameEn?: string } | undefined)?.nameEn ?? '')}
          />
          <label className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={sameName}
              onChange={(e) => setSameName(e.target.checked)}
            />
            {t('sameName')}
          </label>
          <div className="mt-5 flex items-center justify-between gap-2">
            <Link
              href={`${routes.newItem()}?full=1`}
              className="text-sm text-muted-foreground underline"
            >
              {t('advanced')}
            </Link>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? tf('saving') : t('createItem')}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

// The full form: the item with its first pack and price in one go.
export function NewItemPage() {
  return <FullNewItemPage />;
}
