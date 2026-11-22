'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { SearchSelect } from '@/components/controls';
import { Field } from '@/components/forms';
import { Icon } from '@/components/icons';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { BsDatePicker } from '@/components/ui/bs-date-picker';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isApiError, request, type Schema } from '@/lib/api';
import { choices } from '@/lib/choices';
import { unitsFor } from '@/features/products';
import { routes } from '@/lib/routes';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';

type Product = Schema<'AdminProductResponse'>;

type Line = {
  productId: string;
  // An existing pack of the item, or NEW for a pack made as the bill is saved.
  pack: string;
  amount: string;
  unitId: string;
  optionValueIds: string[];
  label: string;
  quantity: string;
  unitCost: string;
  vat: string;
  expiresOn: string;
};

const NEW = 'NEW';
const emptyLine = (): Line => ({
  productId: '',
  pack: '',
  amount: '',
  unitId: '',
  optionValueIds: [],
  label: '',
  quantity: '1',
  unitCost: '',
  vat: '',
  expiresOn: '',
});
const today = () => new Date().toISOString().slice(0, 10);

const cell = 'border-r border-b border-border p-0 align-middle';
const th = 'border-r border-b border-border px-2 py-2 font-medium';
const box =
  'h-9 w-full bg-transparent px-2 text-sm outline-none focus:bg-primary/5 disabled:opacity-40';

// One bought item as one row, like a line of a sheet: pick the item and the pack, say how much it
// holds when the pack is new, then how many and what each cost.
function LineRow({
  line,
  index,
  onChange,
  onRemove,
  removable,
}: {
  line: Line;
  index: number;
  onChange: (patch: Partial<Line>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const t = useTranslations('buyPage');
  const item = useQuery({
    queryKey: ['products', 'buy', line.productId],
    queryFn: () => request<Product>('GET', `/admin/products/${line.productId}`),
    enabled: Boolean(line.productId),
  });
  const packs = item.data?.variants ?? [];
  const making = line.pack === NEW;
  const noPacks = item.isSuccess && packs.length === 0;
  // An item with no pack yet goes straight to making one: nothing to choose from.
  const asked = useRef('');
  useEffect(() => {
    if (noPacks && !line.pack && asked.current !== line.productId) {
      asked.current = line.productId;
      onChange({ pack: NEW });
    }
  }, [noPacks, line.pack, line.productId, onChange]);
  const total = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
  const label = (name: string) => `${name} ${index + 1}`;

  return (
    <tr>
      <td className="sticky left-0 z-[5] border-r border-b border-border bg-card px-2 text-center text-xs text-muted-foreground">
        {index + 1}
      </td>
      <td
        className={`${cell} sticky left-10 z-[5] w-56 max-w-56 min-w-56 bg-card shadow-[1px_0_0_var(--color-border)]`}
      >
        <SearchSelect
          bare
          aria-label={label(t('item'))}
          source={choices.products}
          required
          value={line.productId}
          onChange={(value) => onChange({ productId: String(value), pack: '' })}
        />
      </td>
      <td className={cell}>
        <SearchSelect
          bare
          aria-label={label(t('pack'))}
          disabled={!line.productId}
          placeholder={t('choosePack')}
          value={line.pack}
          options={[
            ...packs.map((pack) => ({
              value: pack.id,
              label: pack.isActive ? pack.label : `${pack.label} (${t('notOnSale')})`,
            })),
            { value: NEW, label: t('newPack') },
          ]}
          onChange={(value) => onChange({ pack: String(value) })}
        />
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('amount'))}
          inputMode="decimal"
          disabled={!making}
          value={making ? line.amount : ''}
          placeholder={making ? '250' : '—'}
          onChange={(e) => onChange({ amount: e.target.value })}
          className={box}
        />
      </td>
      <td className={cell}>
        {making ? (
          <SearchSelect
            bare
            aria-label={label(t('unit'))}
            source={unitsFor(item.data?.sellBy ?? 'PIECE')}
            value={line.unitId}
            onChange={(value) => onChange({ unitId: String(value) })}
          />
        ) : (
          <span className="px-2 text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('packName'))}
          disabled={!making}
          value={making ? line.label : ''}
          maxLength={80}
          placeholder={making ? t('packNamePlaceholder') : '—'}
          onChange={(e) => onChange({ label: e.target.value })}
          className={box}
        />
      </td>
      <td className={cell}>
        {making ? (
          <SearchSelect
            bare
            multiple
            aria-label={label(t('options'))}
            source={choices.optionValues}
            value={line.optionValueIds}
            onChange={(value) => onChange({ optionValueIds: value as string[] })}
          />
        ) : (
          <span className="px-2 text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('quantity'))}
          inputMode="decimal"
          value={line.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
          className={`${box} text-right`}
        />
      </td>
      <td className={cell}>
        <input
          aria-label={label(t('rate'))}
          inputMode="decimal"
          value={line.unitCost}
          placeholder="0"
          onChange={(e) => onChange({ unitCost: e.target.value })}
          className={`${box} text-right`}
        />
      </td>
      <td className={cell}>
        <SearchSelect
          bare
          aria-label={label(t('vat'))}
          required
          value={line.vat || 'AUTO'}
          options={[
            { value: 'AUTO', label: t('vatAuto') },
            { value: '13', label: '13%' },
            { value: '0', label: t('vatNone') },
          ]}
          onChange={(value) => onChange({ vat: value === 'AUTO' ? '' : String(value) })}
        />
      </td>
      <td className={cell}>
        <BsDatePicker
          bare
          aria-label={label(t('expiresCol'))}
          value={line.expiresOn}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(expiresOn) => onChange({ expiresOn })}
        />
      </td>
      <td className="sticky right-[50px] z-[5] border-r border-b border-border bg-card px-3 text-right text-sm whitespace-nowrap tabular-nums shadow-[-1px_0_0_var(--color-border)]">
        {total.toFixed(2)}
      </td>
      <td className="sticky right-0 z-[5] border-b border-border bg-card px-1 text-center">
        <IconButton
          icon="trash"
          variant="danger"
          label={t('removeLine')}
          disabled={!removable}
          onClick={onRemove}
        />
      </td>
    </tr>
  );
}

// Step 2: what came home from the market. Pick the supplier, then each item with its pack (or make the
// pack right here: how much it holds, its colour or size) and what it cost. Nothing is priced for
// sale yet; that is the next step.
export function BuyPage() {
  const t = useTranslations('buyPage');
  const tf = useTranslations('forms');
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [day, setDay] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  // New packs that are already there (same item, amount, unit): said before saving, so stock is never
  // added to a pack by surprise.
  const [merges, setMerges] = useState<string[] | null>(null);
  const findMerges = async (): Promise<string[]> => {
    const found: string[] = [];
    for (const l of lines) {
      if (l.pack !== NEW || !l.productId || !(Number(l.amount) > 0) || !l.unitId) continue;
      const item = await queryClient.fetchQuery({
        queryKey: ['products', 'buy', l.productId],
        queryFn: () => request<Product>('GET', `/admin/products/${l.productId}`),
      });
      const same = item.variants.find(
        (v) =>
          v.pack?.unit.id === l.unitId &&
          Number(v.pack.quantity) === Number(l.amount) &&
          v.options.length === 0 &&
          l.optionValueIds.length === 0,
      );
      if (same)
        found.push(t('mergeLine', { item: item.nameEn, pack: same.label, qty: l.quantity }));
    }
    return found;
  };
  const submit = async (andPost: boolean) => {
    const same = await findMerges();
    if (same.length > 0) {
      setMerges(same);
      pendingPost.current = andPost;
      return;
    }
    save.mutate(andPost);
  };
  const pendingPost = useRef(false);
  const change = (index: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const problem = (l: Line): string | null => {
    if (!l.productId || !l.pack) return t('needPack');
    if (l.pack === NEW && !(Number(l.amount) > 0 && l.unitId) && l.optionValueIds.length === 0) {
      return t('needNewPack');
    }
    if (!(Number(l.quantity) > 0) || !(Number(l.unitCost) > 0)) return t('needRate');
    return null;
  };
  const firstProblem = lines.map(problem).find(Boolean);
  const ready = supplierId && billNo.trim() && !firstProblem;
  // What still keeps Save off, named, so nobody has to guess.
  const missing = [!supplierId && t('supplier'), !billNo.trim() && t('billNo')].filter(Boolean);

  const save = useMutation<boolean, unknown, boolean>({
    mutationFn: async (andPost) => {
      const body = {
        supplierId,
        supplierBillNumber: billNo.trim(),
        billDay: day,
        note: note.trim() || null,
        lines: lines.map((l) => ({
          ...(l.pack === NEW
            ? {
                newPack: {
                  productId: l.productId,
                  ...(Number(l.amount) > 0 && l.unitId
                    ? { packQuantity: Number(l.amount), packUnitId: l.unitId }
                    : {}),
                  ...(l.optionValueIds.length ? { optionValueIds: l.optionValueIds } : {}),
                  ...(l.label.trim() ? { label: l.label.trim() } : {}),
                },
              }
            : { variantId: l.pack }),
          quantity: Number(l.quantity),
          unitCost: l.unitCost,
          ...(l.vat !== '' && { vatRate: l.vat }),
          ...(l.expiresOn && { expiresOn: l.expiresOn }),
        })),
      };
      const saved = await request<{ id: string }>('POST', '/admin/purchase-bills', { body });
      // Posting moves stock, so the API wants an Idempotency-Key; one per bill means a retry posts it once.
      if (andPost)
        await request('POST', `/admin/purchase-bills/${saved.id}/post`, {
          headers: { 'Idempotency-Key': `post-${saved.id}` },
        });
      return andPost;
    },
    onSuccess: async (posted) => {
      toast.success(posted ? t('postedMsg') : t('draftedMsg'));
      await Promise.all(
        ['purchaseBills', 'products', 'stock', 'suppliers'].map((k) =>
          queryClient.invalidateQueries({ queryKey: [k] }),
        ),
      );
      router.push(routes.itemPrices());
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  // A bill half typed is not lost by leaving the page without a word.
  const guard = useUnsavedGuard(
    !save.isSuccess &&
      (supplierId !== '' ||
        billNo !== '' ||
        note !== '' ||
        lines.some((l) => l.productId !== '' || l.unitCost !== '')),
  );

  return (
    <>
      {guard}
      <p className="text-sm text-muted-foreground">{t('note')}</p>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
        <Field label={t('supplier')} htmlFor="buy-supplier" help={t('supplierHelp')}>
          <SearchSelect
            id="buy-supplier"
            source={choices.suppliers}
            required
            value={supplierId}
            onChange={(value) => setSupplierId(String(value))}
          />
        </Field>
        <Field label={t('billNo')} htmlFor="buy-bill" help={t('billNoHelp')}>
          <Input
            id="buy-bill"
            value={billNo}
            maxLength={60}
            onChange={(e) => setBillNo(e.target.value)}
          />
        </Field>
        <Field label={t('day')} htmlFor="buy-day">
          <BsDatePicker
            id="buy-day"
            value={day}
            max={new Date().toISOString().slice(0, 10)}
            onChange={setDay}
          />
        </Field>
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-base font-semibold">{t('what')}</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-[1620px] table-fixed border-separate border-spacing-0 text-sm">
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 230 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 50 }} />
            </colgroup>
            <thead className="bg-muted text-xs whitespace-nowrap text-muted-foreground">
              <tr>
                <th className={`${th} sticky left-0 z-20 bg-muted text-center`}>#</th>
                <th
                  className={`${th} sticky left-10 z-20 bg-muted text-left shadow-[1px_0_0_var(--color-border)]`}
                >
                  {t('item')}
                </th>
                <th className={`${th} text-left`}>{t('packCol')}</th>
                <th className={`${th} text-left`}>{t('amountCol')}</th>
                <th className={`${th} text-left`}>{t('unit')}</th>
                <th className={`${th} text-left`}>{t('nameCol')}</th>
                <th className={`${th} text-left`}>{t('optionsCol')}</th>
                <th className={`${th} text-right`}>{t('quantityCol')}</th>
                <th className={`${th} text-right`}>{t('rateCol')}</th>
                <th className={`${th} text-left`}>{t('vat')}</th>
                <th className={`${th} text-left`}>{t('expiresCol')}</th>
                <th
                  className={`${th} sticky right-[50px] z-20 bg-muted text-right shadow-[-1px_0_0_var(--color-border)]`}
                >
                  {t('totalCol')}
                </th>
                <th className="sticky right-0 z-20 border-b border-border bg-muted" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <LineRow
                  key={index}
                  line={line}
                  index={index}
                  onChange={(patch) => change(index, patch)}
                  onRemove={() => setLines((all) => all.filter((_, i) => i !== index))}
                  removable={lines.length > 1}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLines((all) => [...all, emptyLine()])}
          >
            <Icon name="plus" size={14} />
            {t('addLine')}
          </Button>
        </div>
      </section>

      <Field label={t('noteLabel')} htmlFor="buy-note">
        <Input
          id="buy-note"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <ConfirmDialog
        open={merges !== null}
        onOpenChange={(open) => (open ? undefined : setMerges(null))}
        danger={false}
        title={t('mergeTitle')}
        description={
          <span className="grid gap-1">
            {(merges ?? []).map((line) => (
              <span key={line}>{line}</span>
            ))}
            <span>{t('mergeNote')}</span>
          </span>
        }
        confirmLabel={t('mergeYes')}
        onConfirm={() => {
          setMerges(null);
          save.mutate(pendingPost.current);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={ready ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
          {missing.length > 0
            ? [tf('stillNeeded', { fields: missing.join(', ') }), firstProblem]
                .filter(Boolean)
                .join(' ')
            : (firstProblem ?? t('ready'))}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!ready || save.isPending}
            onClick={() => void submit(false)}
          >
            {t('saveDraft')}
          </Button>
          <Button disabled={!ready || save.isPending} onClick={() => void submit(true)}>
            {save.isPending ? tf('saving') : t('savePost')}
          </Button>
        </div>
      </div>
    </>
  );
}
