'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { request } from '@/lib/api';

import {
  expenseCategoriesResource,
  expensesResource,
  voidExpenseResource,
  type Expense,
  type ExpenseCategory,
} from '../resources';

export function ExpenseCategoriesScreen() {
  return <ResourceScreen resource={expenseCategoriesResource} />;
}

export function ExpensesScreen() {
  const t = useResourceText('expenses');
  const te = useTranslations('expensesSection');
  const categories = useQuery({
    queryKey: ['expenseCategories', 'names'],
    queryFn: () => request<ExpenseCategory[]>('GET', '/admin/expense-categories'),
  });
  const names = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const resource = useMemo(() => expensesResource(t, names), [t, names]);
  const [voiding, setVoiding] = useState<Expense | null>(null);
  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) =>
          row.status === 'RECORDED' ? (
            <IconButton
              icon="x"
              variant="danger"
              label={te('void')}
              onClick={() => setVoiding(row)}
            />
          ) : null
        }
      />
      <ActionModal
        resource={voiding ? voidExpenseResource(voiding) : null}
        title={te('voidTitle')}
        description={te('voidNote')}
        submitLabel={te('void')}
        doneMessage={te('voided')}
        onClose={() => setVoiding(null)}
      />
    </>
  );
}
