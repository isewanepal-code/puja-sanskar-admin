'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

import { discountOf, type Line, type SaleForm } from './types';

type TicketPanelProps = {
  lines: Line[];
  form: SaleForm;
  errors: Record<string, string>;
  pending: boolean;
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onForm: (patch: Partial<SaleForm>) => void;
  onSell: () => void;
};

// A folded section of the sale (customer, discount, note) that says what is in it when shut.
function Fold({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
      >
        <span className="font-medium">{title}</span>
        {!open && summary ? (
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span>
        ) : (
          <span className="flex-1" />
        )}
        <Icon name="down" size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open ? <div className="grid gap-3 border-t border-border p-3">{children}</div> : null}
    </div>
  );
}

function Label({ text, error, children }: { text: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {text}
      {children}
      {error ? <span className="text-destructive">{error}</span> : null}
    </label>
  );
}

// The bill being made: lines with their stepper, what is taken off, the total and the button.
export function TicketPanel({
  lines,
  form,
  errors,
  pending,
  onQuantity,
  onRemove,
  onClear,
  onForm,
  onSell,
}: TicketPanelProps) {
  const t = useTranslations('counterSale');
  const tf = useTranslations('forms');
  const [open, setOpen] = useState<'customer' | 'discount' | 'note' | null>(null);
  const toggle = (name: 'customer' | 'discount' | 'note') => setOpen(open === name ? null : name);

  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const off = discountOf(subtotal, form);
  const total = subtotal - off;
  const money = (amount: number) => formatMoney(amount.toFixed(2), 'en');

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t('currentSale')}</h2>
          <p className="text-xs text-muted-foreground">{t('itemsCount', { count })}</p>
        </div>
        {lines.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('clearConfirm'))) onClear();
            }}
            className="text-sm text-muted-foreground hover:text-destructive"
          >
            {t('clear')}
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {lines.length === 0 ? (
          <div className="grid place-items-center gap-2 px-6 py-14 text-center text-muted-foreground">
            <Icon name="bag" size={36} aria-hidden="true" />
            <p className="text-sm">{errors.lines ?? t('empty')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="grid gap-2 px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{line.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {line.detail} · {line.code}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.id)}
                    aria-label={`${t('remove')}: ${line.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      aria-label={t('less')}
                      disabled={line.quantity <= 1}
                      onClick={() => onQuantity(line.id, line.quantity - 1)}
                      className="grid size-8 place-items-center text-lg hover:bg-muted disabled:opacity-40"
                    >
                      −
                    </button>
                    <input
                      aria-label={t('quantity')}
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(event) =>
                        onQuantity(
                          line.id,
                          Math.min(999, Math.max(1, Number(event.target.value) || 1)),
                        )
                      }
                      className="h-8 w-12 border-x border-border bg-transparent text-center text-sm tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      aria-label={t('more')}
                      onClick={() => onQuantity(line.id, Math.min(999, line.quantity + 1))}
                      className="grid size-8 place-items-center text-lg hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">
                      {money(Number(line.price) * line.quantity)}
                    </div>
                    {line.quantity > 1 ? (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {t('each', { price: formatMoney(line.price, 'en') })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 border-t border-border p-3">
          <Fold
            title={t('customerSection')}
            summary={[form.contactName, form.contactPhone].filter(Boolean).join(' · ')}
            open={open === 'customer'}
            onToggle={() => toggle('customer')}
          >
            <Label text={t('customer')} error={errors.contactName}>
              <Input
                value={form.contactName}
                onChange={(e) => onForm({ contactName: e.target.value })}
              />
            </Label>
            <Label text={t('phone')} error={errors.contactPhone}>
              <Input
                inputMode="tel"
                value={form.contactPhone}
                onChange={(e) => onForm({ contactPhone: e.target.value })}
              />
            </Label>
          </Fold>
          <Fold
            title={t('discountSection')}
            summary={[
              form.couponCode,
              form.discountValue
                ? `${form.discountValue}${form.discountKind === 'PERCENT' ? '%' : ' Rs'}`
                : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            open={open === 'discount'}
            onToggle={() => toggle('discount')}
          >
            <Label text={t('coupon')} error={errors.couponCode}>
              <Input
                className="uppercase"
                value={form.couponCode}
                onChange={(e) => onForm({ couponCode: e.target.value })}
              />
            </Label>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <Label text={t('discount')} error={errors.discountValue}>
                <Input
                  inputMode="decimal"
                  value={form.discountValue}
                  onChange={(e) => onForm({ discountValue: e.target.value })}
                />
              </Label>
              <div
                className="inline-flex rounded-lg bg-muted p-0.5"
                role="group"
                aria-label={t('discountKind')}
              >
                {(['PERCENT', 'FLAT'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={form.discountKind === kind}
                    onClick={() => onForm({ discountKind: kind })}
                    className={cn(
                      'h-8 rounded-md px-3 text-sm font-semibold',
                      form.discountKind === kind ? 'bg-card shadow-sm' : 'text-muted-foreground',
                    )}
                  >
                    {kind === 'PERCENT' ? '%' : 'Rs'}
                  </button>
                ))}
              </div>
            </div>
            {form.discountValue ? (
              <Label text={t('reason')} error={errors.discountReason}>
                <Input
                  value={form.discountReason}
                  onChange={(e) => onForm({ discountReason: e.target.value })}
                />
              </Label>
            ) : null}
          </Fold>
          <Fold
            title={t('noteSection')}
            summary={form.note}
            open={open === 'note'}
            onToggle={() => toggle('note')}
          >
            <Label text={`${t('note')} (${tf('optional')})`} error={errors.note}>
              <Input value={form.note} onChange={(e) => onForm({ note: e.target.value })} />
            </Label>
          </Fold>
        </div>
      </div>

      <footer className="grid gap-2 border-t border-border bg-muted/40 p-4">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('subtotal')}</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          {off > 0 ? (
            <div className="flex justify-between text-success">
              <dt>{t('discount')}</dt>
              <dd className="tabular-nums">− {money(off)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-semibold">{t('estimated')}</dt>
            <dd className="font-heading text-2xl font-semibold tabular-nums">{money(total)}</dd>
          </div>
        </dl>
        <Button
          size="lg"
          icon="check"
          title={t('shortcuts')}
          disabled={pending || lines.length === 0}
          onClick={onSell}
        >
          {pending ? tf('saving') : t('sell')}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t('afterNote')}</p>
      </footer>
    </aside>
  );
}
