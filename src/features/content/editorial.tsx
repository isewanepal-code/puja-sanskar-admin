import { activeColumn, ActiveBadge, type Resource } from '@/components/resource';
import { Thumb } from '@/components/media-library/thumb';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { choices, mergedSource } from '@/lib/choices';
import { formatDate, formatDateTime } from '@/lib/format';

type Festival = Schema<'AdminFestivalResponse'>;
type FestivalDate = Schema<'AdminFestivalDateResponse'>;
type Article = Schema<'AdminArticleResponse'>;
type Review = Schema<'AdminReviewResponse'>;
type Banner = Schema<'AdminBannerResponse'>;
type Section = Schema<'AdminHomeSectionResponse'>;
type Puja = Schema<'AdminPujaResponse'>;
type Kit = Schema<'AdminKitResponse'>;
type Product = Schema<'AdminProductResponse'>;
type Name = (key: string) => string;

const HTML_KIND = 'html' as const;
const ARTICLE_TYPES = ['GUIDE', 'PAGE', 'BLOG'] as const;
const ARTICLE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const VERIFY_STATUSES = ['UNVERIFIED', 'REVIEWED', 'VERIFIED'] as const;
const PLACEMENTS = ['HOME_HERO', 'HOME_STRIP'] as const;
const SECTION_KINDS = ['PRODUCTS', 'KITS', 'PUJAS'] as const;

const named = (ne: string, en?: string | null) => (
  <>
    <div>{ne}</div>
    {en ? <div className="text-xs text-muted-foreground">{en}</div> : null}
  </>
);

// What each home row may list, remembered so a row's check can tell a kit from a puja.
const itemKind = new Map<string, (typeof SECTION_KINDS)[number]>();
const homeItemChoices = (name: Name) => {
  const list = <T extends { id: string; nameNe: string; code: string }>(
    kind: (typeof SECTION_KINDS)[number],
    path: string,
  ) => ({
    path,
    toChoices: (row: T) => {
      itemKind.set(row.id, kind);
      return [{ value: row.id, label: row.nameNe, detail: row.code, group: name(`kinds.${kind}`) }];
    },
  });
  return mergedSource('home-items', [
    list<Product>('PRODUCTS', '/admin/products'),
    list<Kit>('KITS', '/admin/kits'),
    list<Puja>('PUJAS', '/admin/pujas'),
  ]);
};

const schedule = [
  { name: 'sortOrder', kind: 'number' as const, section: 'schedule' },
  { name: 'startsAt', kind: 'datetime' as const },
  { name: 'endsAt', kind: 'datetime' as const },
  { name: 'isActive', kind: 'switch' as const },
];

const scheduleCell = (row: { schedule: { startsAt: string | null; endsAt: string | null } }) =>
  row.schedule.startsAt || row.schedule.endsAt
    ? `${row.schedule.startsAt ? formatDate(row.schedule.startsAt, 'en') : '…'} – ${
        row.schedule.endsAt ? formatDate(row.schedule.endsAt, 'en') : '…'
      }`
    : '—';

// The next date a festival falls on, or its last one.
const nextDate = (dates: FestivalDate[]) => {
  const today = new Date().toISOString().slice(0, 10);
  return dates.find((d) => d.endsOn >= today) ?? dates.at(-1) ?? null;
};

export const festivalsResource: Resource<Festival> = {
  key: 'festivals',
  path: '/admin/festivals',
  list: 'paged',
  rowId: (row) => row.id,
  rowLabel: (row) => `${row.code} · ${row.nameNe}`,
  initialSort: { key: 'sortOrder', direction: 'asc' },
  modalSize: 'lg',
  columns: [
    {
      key: 'code',
      cell: (row) => <span className="font-semibold">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    { key: 'nameNe', cell: (row) => named(row.nameNe, row.nameEn), sortValue: (row) => row.nameNe },
    {
      key: 'dates',
      cell: (row) => {
        const date = nextDate(row.dates);
        return date ? formatDate(date.startsOn, 'en') : '—';
      },
      sortValue: (row) => nextDate(row.dates)?.startsOn,
    },
    {
      key: 'pujaIds',
      cell: (row) => <Badge>{row.pujaIds.length}</Badge>,
      sortValue: (row) => row.pujaIds.length,
      align: 'right',
    },
    { key: 'sortOrder', cell: (row) => row.sortOrder, sortValue: (row) => row.sortOrder },
    activeColumn(),
  ],
  fields: [
    { name: 'code', kind: 'code', required: true, createOnly: true, max: 32 },
    { name: 'mantraId', kind: 'select', optionsFrom: choices.mantras },
    { name: 'nameNe', kind: 'text', required: true, max: 160 },
    { name: 'nameEn', kind: 'text', required: true, max: 160 },
    { name: 'nameRomanized', kind: 'text', max: 160 },
    { name: 'sortOrder', kind: 'number' },
    { name: 'imageUrl', kind: 'image', section: 'website', wide: true },
    { name: 'summaryNe', kind: 'textarea', max: 500 },
    { name: 'summaryEn', kind: 'textarea', max: 500 },
    { name: 'descriptionNe', kind: HTML_KIND, max: 20000 },
    { name: 'descriptionEn', kind: HTML_KIND, max: 20000 },
    { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
    { name: 'metaTitle', kind: 'text', max: 70, wide: true },
    { name: 'metaDescription', kind: 'textarea', max: 160 },
    { name: 'isActive', kind: 'switch' },
  ],
};

// A festival's dates, one per year; lunar dates are entered, never worked out.
export function festivalDatesResource(festival: Festival, name: Name): Resource<FestivalDate> {
  return {
    key: 'festivalDates',
    scope: 'festivals',
    path: `/admin/festivals/${festival.id}/dates`,
    list: 'all',
    loadAll: async () => (await request<Festival>('GET', `/admin/festivals/${festival.id}`)).dates,
    canEdit: false,
    rowId: (row) => row.id,
    rowLabel: (row) => formatDate(row.startsOn, 'en'),
    initialSort: { key: 'startsOn', direction: 'desc' },
    modalSize: 'sm',
    bulk: ['startsOn', 'endsOn', 'note'],
    check: ({ startsOn, endsOn }) =>
      startsOn && endsOn && String(endsOn) < String(startsOn)
        ? { field: 'endsOn', message: name('rules.order') }
        : null,
    columns: [
      {
        key: 'startsOn',
        cell: (row) => formatDate(row.startsOn, 'en'),
        sortValue: (row) => row.startsOn,
      },
      {
        key: 'endsOn',
        cell: (row) => formatDate(row.endsOn, 'en'),
        sortValue: (row) => row.endsOn,
      },
      { key: 'note', cell: (row) => row.note ?? '—' },
    ],
    fields: [
      { name: 'startsOn', kind: 'date', required: true },
      { name: 'endsOn', kind: 'date', required: true },
      { name: 'note', kind: 'text', max: 200, wide: true },
    ],
  };
}

// The pujas a festival brings; the list sent replaces the old one.
export function festivalPujasResource(festival: Festival): Resource<never> {
  return {
    key: 'festivalPujas',
    scope: 'festivals',
    path: `/admin/festivals/${festival.id}/pujas`,
    submitMethod: 'PUT',
    list: 'all',
    rowId: () => '',
    rowLabel: () => festival.nameNe,
    columns: [],
    fields: [{ name: 'pujaIds', kind: 'multiselect', optionsFrom: choices.pujas }],
  };
}

const VERIFY_TONE = { UNVERIFIED: 'neutral', REVIEWED: 'warning', VERIFIED: 'success' } as const;
const STATUS_TONE = { DRAFT: 'neutral', PUBLISHED: 'success', ARCHIVED: 'warning' } as const;

export function articlesResource(name: Name): Resource<Article> {
  return {
    key: 'articles',
    path: '/admin/articles',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => row.titleNe ?? row.titleEn,
    initialSort: { key: 'updatedAt', direction: 'desc' },
    modalSize: 'xl',
    check: ({ type, pujaId }) =>
      type === 'GUIDE' && !pujaId ? { field: 'pujaId', message: name('rules.guide') } : null,
    columns: [
      {
        key: 'titleEn',
        cell: (row) => named(row.titleNe ?? row.titleEn, row.titleNe ? row.titleEn : null),
        sortValue: (row) => row.titleEn,
      },
      { key: 'type', cell: (row) => name(`types.${row.type}`), sortValue: (row) => row.type },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={STATUS_TONE[row.status]}>{name(`statuses.${row.status}`)}</Badge>
        ),
        sortValue: (row) => row.status,
      },
      {
        key: 'verificationStatus',
        cell: (row) =>
          row.type === 'GUIDE' ? (
            <Badge
              tone={VERIFY_TONE[row.verificationStatus as keyof typeof VERIFY_TONE] ?? 'neutral'}
            >
              {name(`checks.${row.verificationStatus}`)}
            </Badge>
          ) : (
            '—'
          ),
        sortValue: (row) => row.verificationStatus,
      },
      {
        key: 'updatedAt',
        cell: (row) => formatDateTime(row.updatedAt, 'en'),
        sortValue: (row) => row.updatedAt,
      },
    ],
    fields: [
      {
        name: 'type',
        kind: 'select',
        required: true,
        createOnly: true,
        options: ARTICLE_TYPES.map((type) => ({ value: type, label: name(`types.${type}`) })),
        defaultValue: 'GUIDE',
      },
      { name: 'pujaId', kind: 'select', optionsFrom: choices.pujas },
      { name: 'festivalId', kind: 'select', optionsFrom: choices.festivals },
      { name: 'titleNe', kind: 'text', max: 200 },
      { name: 'titleEn', kind: 'text', required: true, max: 200 },
      { name: 'coverImageUrl', kind: 'image', wide: true },
      { name: 'summaryNe', kind: 'textarea', max: 500 },
      { name: 'summaryEn', kind: 'textarea', max: 500 },
      { name: 'bodyNe', kind: HTML_KIND, max: 100000 },
      { name: 'bodyEn', kind: HTML_KIND, required: true, max: 100000 },
      { name: 'slug', kind: 'slug', max: 160, section: 'seo', wide: true },
      { name: 'metaTitle', kind: 'text', max: 70, wide: true },
      { name: 'metaDescription', kind: 'textarea', max: 160 },
    ],
  };
}

// Moves an article between draft, published and archived.
export function articleStatusResource(article: Article, name: Name): Resource<never> {
  return {
    key: 'articleStatus',
    scope: 'articles',
    path: `/admin/articles/${article.id}/status`,
    submitMethod: 'PATCH',
    list: 'all',
    rowId: () => '',
    rowLabel: () => article.titleEn,
    columns: [],
    fields: [
      {
        name: 'status',
        kind: 'select',
        required: true,
        options: ARTICLE_STATUSES.map((status) => ({
          value: status,
          label: name(`statuses.${status}`),
        })),
      },
    ],
  };
}

// How sure the shop is of a guide's religious content; needs knowledge:verify.
export function articleCheckResource(article: Article, name: Name): Resource<never> {
  return {
    key: 'articleCheck',
    scope: 'articles',
    path: `/admin/articles/${article.id}/verification`,
    submitMethod: 'PATCH',
    list: 'all',
    rowId: () => '',
    rowLabel: () => article.titleEn,
    columns: [],
    fields: [
      {
        name: 'status',
        kind: 'select',
        required: true,
        options: VERIFY_STATUSES.map((status) => ({
          value: status,
          label: name(`checks.${status}`),
        })),
      },
    ],
  };
}

export function reviewsResource(name: Name): Resource<Review> {
  return {
    key: 'reviews',
    path: '/admin/reviews',
    list: 'paged',
    searchable: false,
    canCreate: false,
    canDelete: false,
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.authorName} · ${row.rating}★`,
    initialSort: { key: 'createdAt', direction: 'desc' },
    modalSize: 'sm',
    columns: [
      {
        key: 'rating',
        cell: (row) => (
          <span className="whitespace-nowrap text-warning">{'★'.repeat(row.rating)}</span>
        ),
        sortValue: (row) => row.rating,
      },
      {
        key: 'body',
        cell: (row) => (
          <>
            {row.title ? <div className="font-medium">{row.title}</div> : null}
            <div className="line-clamp-2 text-muted-foreground">{row.body ?? '—'}</div>
          </>
        ),
      },
      { key: 'authorName', cell: (row) => row.authorName, sortValue: (row) => row.authorName },
      {
        key: 'status',
        cell: (row) => (
          <Badge tone={row.status === 'PUBLISHED' ? 'success' : 'neutral'}>
            {name(`statuses.${row.status}`)}
          </Badge>
        ),
        sortValue: (row) => row.status,
      },
      {
        key: 'createdAt',
        cell: (row) => formatDate(row.createdAt, 'en'),
        sortValue: (row) => row.createdAt,
      },
    ],
    fields: [
      {
        name: 'status',
        kind: 'select',
        required: true,
        options: (['PUBLISHED', 'HIDDEN'] as const).map((status) => ({
          value: status,
          label: name(`statuses.${status}`),
        })),
      },
      { name: 'note', kind: 'textarea', max: 300 },
    ],
  };
}

export function bannersResource(name: Name): Resource<Banner> {
  return {
    key: 'banners',
    path: '/admin/banners',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => row.title,
    matches: (row, q) => `${row.title} ${row.subtitle ?? ''}`.toLowerCase().includes(q),
    initialSort: { key: 'placement', direction: 'asc' },
    modalSize: 'lg',
    formRow: (row) => ({ ...row, ...row.schedule }),
    columns: [
      {
        key: 'imageUrl',
        cell: (row) => <Thumb src={row.imageUrl} size={48} className="h-12 w-20" />,
      },
      {
        key: 'title',
        cell: (row) => named(row.title, row.subtitle),
        sortValue: (row) => row.title,
      },
      {
        key: 'placement',
        cell: (row) => name(`placements.${row.placement}`),
        sortValue: (row) => `${row.placement}-${String(row.schedule.sortOrder).padStart(4, '0')}`,
      },
      { key: 'startsAt', cell: scheduleCell, sortValue: (row) => row.schedule.startsAt },
      {
        key: 'isActive',
        cell: (row) => <ActiveBadge on={row.schedule.isActive} />,
        sortValue: (row) => row.schedule.isActive,
      },
    ],
    fields: [
      {
        name: 'placement',
        kind: 'select',
        required: true,
        options: PLACEMENTS.map((placement) => ({
          value: placement,
          label: name(`placements.${placement}`),
        })),
        defaultValue: 'HOME_HERO',
      },
      { name: 'imageUrl', kind: 'image', required: true, wide: true },
      { name: 'title', kind: 'text', required: true, max: 120, wide: true },
      { name: 'subtitle', kind: 'text', max: 240, wide: true },
      { name: 'linkUrl', kind: 'text', wide: true },
      ...schedule,
    ],
  };
}

export function homeSectionsResource(name: Name): Resource<Section> {
  return {
    key: 'homeSections',
    path: '/admin/home-sections',
    list: 'all',
    rowId: (row) => row.id,
    rowLabel: (row) => row.titleNe ?? row.title,
    matches: (row, q) => `${row.title} ${row.titleNe ?? ''}`.toLowerCase().includes(q),
    initialSort: { key: 'sortOrder', direction: 'asc' },
    modalSize: 'lg',
    formRow: (row) => ({ ...row, ...row.schedule }),
    check: ({ kind, itemIds }) =>
      Array.isArray(itemIds) &&
      itemIds.some((id) => itemKind.has(String(id)) && itemKind.get(String(id)) !== kind)
        ? { field: 'itemIds', message: name('rules.kind') }
        : null,
    columns: [
      {
        key: 'title',
        cell: (row) => named(row.titleNe ?? row.title, row.titleNe ? row.title : null),
        sortValue: (row) => row.title,
      },
      { key: 'kind', cell: (row) => name(`kinds.${row.kind}`), sortValue: (row) => row.kind },
      {
        key: 'itemIds',
        cell: (row) => <Badge>{row.itemIds.length}</Badge>,
        sortValue: (row) => row.itemIds.length,
        align: 'right',
      },
      {
        key: 'sortOrder',
        cell: (row) => row.schedule.sortOrder,
        sortValue: (row) => row.schedule.sortOrder,
      },
      { key: 'startsAt', cell: scheduleCell, sortValue: (row) => row.schedule.startsAt },
      {
        key: 'isActive',
        cell: (row) => <ActiveBadge on={row.schedule.isActive} />,
        sortValue: (row) => row.schedule.isActive,
      },
    ],
    fields: [
      {
        name: 'kind',
        kind: 'select',
        required: true,
        options: SECTION_KINDS.map((kind) => ({ value: kind, label: name(`kinds.${kind}`) })),
        defaultValue: 'PRODUCTS',
      },
      { name: 'title', kind: 'text', required: true, max: 120 },
      { name: 'titleNe', kind: 'text', max: 120 },
      { name: 'itemIds', kind: 'multiselect', required: true, optionsFrom: homeItemChoices(name) },
      ...schedule,
    ],
  };
}
