'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/overlays';
import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { isApiError, request, type Schema } from '@/lib/api';

import { resetPasswordResource, usersResource } from '../resources';

type User = Schema<'UserResponse'>;

export function UsersScreen() {
  const t = useResourceText('users');
  const ta = useTranslations('actions');
  const tf = useTranslations('forms');
  const toast = useToast();
  const resource = useMemo(() => usersResource(t), [t]);
  const [resetting, setResetting] = useState<User | null>(null);

  const unlock = useMutation({
    mutationFn: (user: User) => request('POST', `/admin/users/${user.id}/unlock`),
    onSuccess: () => toast.success(ta('unlocked')),
    onError: (error) => toast.error(isApiError(error) ? error.message : tf('failed')),
  });

  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <>
            <IconButton icon="lock" label={ta('unlock')} onClick={() => unlock.mutate(row)} />
            <IconButton
              icon="refresh"
              label={ta('resetPassword')}
              onClick={() => setResetting(row)}
            />
          </>
        )}
      />
      <ActionModal
        resource={resetting ? resetPasswordResource(resetting) : null}
        title={ta('resetPasswordFor', { name: resetting?.fullName ?? '' })}
        description={ta('resetPasswordNote')}
        submitLabel={ta('resetPassword')}
        doneMessage={ta('passwordReset')}
        onClose={() => setResetting(null)}
      />
    </>
  );
}
