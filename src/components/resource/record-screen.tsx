'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { isApiError, request } from '@/lib/api';

import { ResourceForm } from './resource-form';
import type { Resource } from './types';

// One record edited in place (the shop's settings, its business profile); a missing one starts empty.
export function RecordScreen<T>({ resource }: { resource: Resource<T> }) {
  const tf = useTranslations('forms');
  const tt = useTranslations('table');
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const record = useQuery({
    queryKey: [resource.scope ?? resource.key, resource.path, 'record'],
    queryFn: async () => {
      try {
        return await request<T>('GET', resource.path);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
  });

  if (record.isPending) return <p className="text-sm text-muted-foreground">{tt('loading')}</p>;
  if (record.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {isApiError(record.error) ? record.error.message : tt('failed')}
      </p>
    );
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <ResourceForm
        key={record.dataUpdatedAt}
        resource={resource}
        row={record.data ?? undefined}
        formId={formId}
        successMessage={tf('saved')}
        onPendingChange={setSaving}
        onDone={() => undefined}
      />
      <div>
        <Button type="submit" form={formId} disabled={saving}>
          {saving ? tf('saving') : tf('save')}
        </Button>
      </div>
    </div>
  );
}
