import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { formatDate, formatMoney } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { getAccounts, getPujaCounts } from '../api/server';

type Accounts = Awaited<ReturnType<typeof getAccounts>>;
type Pujas = Awaited<ReturnType<typeof getPujaCounts>>;

// What each cash and bank account holds now, and the total.
export async function CashAndBank({ accounts }: { accounts: Accounts }) {
  const t = await getTranslations('dashboard.cash');
  const money = (amount: string) => formatMoney(amount, 'en');
  const total = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  return (
    <div className="panel grid content-start gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <Link href={routes.moneyAccounts()} className="text-sm text-primary">
          {t('open')}
        </Link>
      </div>
      <div className="font-heading text-2xl font-semibold tabular-nums">
        {money(total.toFixed(2))}
      </div>
      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">
                {account.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {t(`kinds.${account.kind}`)} · {account.branch.name}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{money(account.balance)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// How many pujas the shop offers, and the festivals coming up.
export async function PujasPanel({ pujas }: { pujas: Pujas }) {
  const t = await getTranslations('dashboard.pujas');
  return (
    <div className="panel grid content-start gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <Link href={routes.pujas()} className="text-sm text-primary">
          {t('open')}
        </Link>
      </div>
      <div className="flex items-end gap-6">
        <div>
          <div className="font-heading text-2xl font-semibold tabular-nums">{pujas.total}</div>
          <div className="text-xs text-muted-foreground">{t('total')}</div>
        </div>
        <div>
          <div className="font-heading text-2xl font-semibold text-success tabular-nums">
            {pujas.active}
          </div>
          <div className="text-xs text-muted-foreground">{t('shown')}</div>
        </div>
      </div>
      <div className="text-sm font-medium">{t('upcoming')}</div>
      {pujas.upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noneUpcoming')}</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {pujas.upcoming.map((festival) => (
            <li
              key={`${festival.id}-${festival.on}`}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0 truncate">{festival.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatDate(festival.on, 'en')}
                {festival.to !== festival.on ? ` – ${formatDate(festival.to, 'en')}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
