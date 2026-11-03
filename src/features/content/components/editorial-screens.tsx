'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ActionModal, ResourceScreen, useResourceText } from '@/components/resource';
import { IconButton } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { request, type Schema } from '@/lib/api';

import {
  articleCheckResource,
  articlesResource,
  articleStatusResource,
  bannersResource,
  festivalDatesResource,
  festivalPujasResource,
  festivalsResource,
  homeSectionsResource,
  reviewsResource,
} from '../editorial';

type Festival = Schema<'AdminFestivalResponse'>;
type Article = Schema<'AdminArticleResponse'>;

export function FestivalsScreen() {
  const t = useTranslations('actions');
  const tf = useResourceText('festivalDates');
  const [open, setOpen] = useState<{ what: 'dates' | 'pujas'; festival: Festival } | null>(null);
  // The festival as it is now, so the pujas form starts from what is saved.
  const current = useQuery({
    queryKey: ['festivals', 'one', open?.festival.id],
    queryFn: () => request<Festival>('GET', `/admin/festivals/${open!.festival.id}`),
    enabled: open?.what === 'pujas',
  });
  const name = open ? `${open.festival.code} · ${open.festival.nameNe}` : '';

  return (
    <>
      <ResourceScreen
        resource={festivalsResource}
        rowActions={(row) => (
          <>
            <IconButton
              icon="calendar"
              label={t('dates')}
              onClick={() => setOpen({ what: 'dates', festival: row })}
            />
            <IconButton
              icon="temple"
              label={t('festivalPujas')}
              onClick={() => setOpen({ what: 'pujas', festival: row })}
            />
          </>
        )}
      />
      <Modal
        open={open?.what === 'dates'}
        onOpenChange={(next) => (next ? undefined : setOpen(null))}
        size="lg"
        title={t('datesOf', { name })}
        description={t('datesNote')}
      >
        {open?.what === 'dates' ? (
          <ResourceScreen resource={festivalDatesResource(open.festival, tf)} />
        ) : null}
      </Modal>
      <ActionModal
        resource={
          open?.what === 'pujas' && current.data ? festivalPujasResource(current.data) : null
        }
        defaults={{ pujaIds: current.data?.pujaIds ?? [] }}
        size="lg"
        title={t('festivalPujasOf', { name })}
        description={t('festivalPujasNote')}
        submitLabel={t('save')}
        doneMessage={t('saved')}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

export function ArticlesScreen() {
  const t = useTranslations('actions');
  const ta = useResourceText('articles');
  const resource = useMemo(() => articlesResource(ta), [ta]);
  const [open, setOpen] = useState<{ what: 'status' | 'check'; article: Article } | null>(null);
  const title = open ? (open.article.titleNe ?? open.article.titleEn) : '';

  return (
    <>
      <ResourceScreen
        resource={resource}
        rowActions={(row) => (
          <>
            <IconButton
              icon="eye"
              label={t('publish')}
              onClick={() => setOpen({ what: 'status', article: row })}
            />
            {row.type === 'GUIDE' ? (
              <IconButton
                icon="shield"
                label={t('verify')}
                onClick={() => setOpen({ what: 'check', article: row })}
              />
            ) : null}
          </>
        )}
      />
      <ActionModal
        resource={open?.what === 'status' ? articleStatusResource(open.article, ta) : null}
        defaults={{ status: open?.article.status }}
        title={t('publishFor', { name: title })}
        description={t('publishNote')}
        submitLabel={t('save')}
        doneMessage={t('saved')}
        onClose={() => setOpen(null)}
      />
      <ActionModal
        resource={open?.what === 'check' ? articleCheckResource(open.article, ta) : null}
        defaults={{ status: open?.article.verificationStatus }}
        title={t('verifyFor', { name: title })}
        description={t('verifyNote')}
        submitLabel={t('verify')}
        doneMessage={t('verified')}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

export function ReviewsScreen() {
  const t = useResourceText('reviews');
  const resource = useMemo(() => reviewsResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function BannersScreen() {
  const t = useResourceText('banners');
  const resource = useMemo(() => bannersResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}

export function HomeSectionsScreen() {
  const t = useResourceText('homeSections');
  const resource = useMemo(() => homeSectionsResource(t), [t]);
  return <ResourceScreen resource={resource} />;
}
