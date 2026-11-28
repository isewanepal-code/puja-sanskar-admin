import { activeColumn, type Field, type Resource } from '@/components/resource';
import { Badge } from '@/components/ui/badge';
import { request, type Schema } from '@/lib/api';
import { choices, pagedSource, type ChoiceSource } from '@/lib/choices';
import { formatDate, formatMoney } from '@/lib/format';

export type Offer = Schema<'PriceOfferResponse'>;
type Target = Schema<'OfferTargetResponse'>;
type Tier = Schema<'KitTierResponse'>;
type Name = (key: string) => string;

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const RULE_KINDS = ['PERCENT', 'FLAT', 'PRICE'] as const;
const SCHEDULES = ['ALWAYS', 'RANGE', 'WEEKLY'] as const;

type Category = Schema<'AdminCategoryResponse'>;
type Group = Schema<'PriceGroupResponse'>;

const categories: ChoiceSource = pagedSource<Category>('offer-categories', {
  path: '/admin/categories',
  toChoices: (row) => [{ value: row.id, label: row.nameNe, detail: row.code }],
  find: (id) => `/admin/categories/${id}`,
});
export const priceGroups: ChoiceSource = pagedSource<Group>('price-groups', {
  path: '/admin/price-groups',
  toChoices: (row) => [{ value: row.id, label: row.name, detail: row.code }],
  find: (id) => `/admin/price-groups/${id}`,
});

const ids = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const minutes = (text: unknown) => {
  const match = /^(\d{2}):(\d{2})/.exec(String(text ?? ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const clock = (minute: number | null | undefined) =>
  minute === null || minute === undefined
    ? ''
    : `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

// "2: 15%" or "3: Rs 200" per line, as the kit tiers the API takes.
export const tiersCodec = {
  toText: (value: unknown) =>
    (Array.isArray(value) ? (value as Tier[]) : [])
      .map(
        (t) =>
          `${t.minKits}: ${t.kind === 'PERCENT' ? `${Number(t.value)}%` : `Rs ${Number(t.value)}`}`,
      )
      .join('\n'),
  fromText: (text: string): Tier[] =>
    text
      .split('\n')
      .map((line) =>
        /^\s*(\d+)\s*[:=-]\s*(?:(Rs\.?|रु\.?)\s*)?(\d+(?:\.\d+)?)\s*(%?)\s*$/i.exec(line),
      )
      .flatMap((m) =>
        m
          ? [
              {
                minKits: Number(m[1]),
                kind: m[4] === '%' || !m[2] ? ('PERCENT' as const) : ('FLAT' as const),
                value: m[3]!,
              },
            ]
          : [],
      ),
};

export const ruleText = (rule: Offer['alone'], name: Name) =>
  rule
    ? rule.kind === 'PERCENT'
      ? `${Number(rule.value)}%`
      : rule.kind === 'FLAT'
        ? `− ${formatMoney(rule.value, 'en')}`
        : `${name('rule.price')} ${formatMoney(rule.value, 'en')}`
    : '—';

export function whenText(offer: Offer, name: Name) {
  if (offer.schedule === 'ALWAYS') return name('schedules.ALWAYS');
  if (offer.schedule === 'RANGE') {
    return `${offer.startsAt ? formatDate(offer.startsAt, 'en') : ''} → ${offer.endsAt ? formatDate(offer.endsAt, 'en') : ''}`;
  }
  const days = offer.weekdays.length
    ? offer.weekdays.map((d) => name(`weekdays.${d}`)).join(', ')
    : name('weekdays.all');
  const hours =
    offer.dayFromMinute !== null && offer.dayToMinute !== null
      ? ` ${clock(offer.dayFromMinute)}–${clock(offer.dayToMinute)}`
      : '';
  return `${days}${hours}`;
}

// What the offer covers, as the form edits it: one list per kind, and what is left out.
function coversOf(targets: Target[]) {
  const pick = (kind: Target['kind'], excluded = false) =>
    targets
      .filter((t) => t.kind === kind && t.excluded === excluded && t.refId)
      .map((t) => t.refId!);
  return {
    everything: targets.some((t) => t.kind === 'ALL' && !t.excluded),
    categoryIds: pick('CATEGORY'),
    productIds: pick('PRODUCT'),
    variantIds: pick('VARIANT'),
    kitIds: pick('KIT'),
    groupIds: pick('GROUP'),
    leaveOutProductIds: pick('PRODUCT', true),
    leaveOutKitIds: pick('KIT', true),
    leaveOutGroupIds: pick('GROUP', true),
  };
}

export function offersResource(name: Name): Resource<Offer> {
  const rule = (field: 'alone' | 'withKit'): Field[] => [
    {
      name: `${field}Kind`,
      kind: 'select',
      section: field === 'alone' ? 'price' : undefined,
      options: RULE_KINDS.map((k) => ({ value: k, label: name(`rule.${k}`) })),
    },
    { name: `${field}Value`, kind: 'money' },
  ];

  return {
    key: 'offers',
    path: '/admin/price-offers',
    list: 'paged',
    rowId: (row) => row.id,
    rowLabel: (row) => `${row.code} · ${row.name}`,
    initialSort: { key: 'code', direction: 'asc' },
    modalSize: 'lg',
    check: ({
      schedule,
      startsAt,
      endsAt,
      aloneKind,
      aloneValue,
      withKitKind,
      withKitValue,
      kitTiers,
    }) => {
      if (schedule === 'RANGE' && (!startsAt || !endsAt))
        return { field: 'startsAt', message: name('rules.dates') };
      if ((aloneKind && !aloneValue) || (!aloneKind && aloneValue))
        return { field: 'aloneValue', message: name('rules.pair') };
      if ((withKitKind && !withKitValue) || (!withKitKind && withKitValue))
        return { field: 'withKitValue', message: name('rules.pair') };
      const tiers = Array.isArray(kitTiers) ? kitTiers : [];
      if (!aloneKind && !withKitKind && tiers.length === 0)
        return { field: 'aloneKind', message: name('rules.empty') };
      return null;
    },
    // The form keeps what an offer covers as lists; the API takes them as one list of targets.
    formRow: (row) => ({
      ...row,
      weekdays: row.weekdays.map(String),
      dayFrom: clock(row.dayFromMinute),
      dayTo: clock(row.dayToMinute),
      more:
        row.targets.some((t) => t.excluded) ||
        !row.allowCoupons ||
        row.priority !== 0 ||
        !!row.titleEn ||
        !!row.titleNe,
      aloneKind: row.alone?.kind ?? '',
      aloneValue: row.alone?.value ?? '',
      withKitKind: row.withKit?.kind ?? '',
      withKitValue: row.withKit?.value ?? '',
      ...coversOf(row.targets),
    }),
    shapeBody: ({
      everything,
      categoryIds,
      productIds,
      variantIds,
      kitIds,
      groupIds,
      leaveOutProductIds,
      leaveOutKitIds,
      leaveOutGroupIds,
      aloneKind,
      aloneValue,
      withKitKind,
      withKitValue,
      weekdays,
      dayFrom,
      dayTo,
      schedule,
      startsAt,
      endsAt,
      // Only for the form: whether the extras are shown.
      more: _more,
      ...body
    }) => {
      const some = (kind: Target['kind'], list: unknown, excluded = false) =>
        ids(list).map((refId) => ({ kind, refId, excluded }));
      const weekly = schedule === 'WEEKLY';
      return {
        ...body,
        schedule,
        startsAt: schedule === 'RANGE' ? startsAt : null,
        endsAt: schedule === 'RANGE' ? endsAt : null,
        weekdays: weekly ? ids(weekdays).map(Number) : [],
        dayFromMinute: weekly ? minutes(dayFrom) : null,
        dayToMinute: weekly ? minutes(dayTo) : null,
        alone: aloneKind && aloneValue ? { kind: aloneKind, value: String(aloneValue) } : null,
        withKit:
          withKitKind && withKitValue ? { kind: withKitKind, value: String(withKitValue) } : null,
        targets: [
          ...(everything ? [{ kind: 'ALL', refId: null, excluded: false }] : []),
          ...some('CATEGORY', categoryIds),
          ...some('PRODUCT', productIds),
          ...some('VARIANT', variantIds),
          ...some('KIT', kitIds),
          ...some('GROUP', groupIds),
          ...some('PRODUCT', leaveOutProductIds, true),
          ...some('KIT', leaveOutKitIds, true),
          ...some('GROUP', leaveOutGroupIds, true),
        ],
      };
    },
    columns: [
      {
        key: 'code',
        cell: (row) => <span className="font-semibold">{row.code}</span>,
        sortValue: (row) => row.code,
      },
      {
        key: 'name',
        cell: (row) => (
          <>
            <div>{row.name}</div>
            {row.titleNe ? (
              <div className="text-xs text-muted-foreground">{row.titleNe}</div>
            ) : null}
          </>
        ),
        sortValue: (row) => row.name,
      },
      { key: 'when', cell: (row) => whenText(row, name), sortValue: (row) => row.schedule },
      {
        key: 'prices',
        cell: (row) => (
          <>
            <div>
              {name('rule.alone')}: {ruleText(row.alone, name)}
            </div>
            <div className="text-xs text-muted-foreground">
              {name('rule.withKit')}: {ruleText(row.withKit, name)}
              {row.kitTiers.length > 0 ? ` · ${row.kitTiers.length} ${name('rule.tiers')}` : ''}
            </div>
          </>
        ),
      },
      {
        key: 'targets',
        cell: (row) => <Badge>{row.targets.filter((t) => !t.excluded).length}</Badge>,
        sortValue: (row) => row.targets.length,
        align: 'right',
      },
      {
        key: 'allowCoupons',
        cell: (row) => (row.allowCoupons ? '✓' : '—'),
        sortValue: (row) => row.allowCoupons,
      },
      activeColumn(),
    ],
    fields: [
      { name: 'name', kind: 'text', required: true, max: 160, wide: true },
      {
        name: 'schedule',
        kind: 'select',
        required: true,
        section: 'when',
        defaultValue: 'ALWAYS',
        options: SCHEDULES.map((s) => ({ value: s, label: name(`schedules.${s}`) })),
      },
      { name: 'startsAt', kind: 'datetime', showWhen: (v) => v.schedule === 'RANGE' },
      { name: 'endsAt', kind: 'datetime', showWhen: (v) => v.schedule === 'RANGE' },
      {
        name: 'weekdays',
        kind: 'multiselect',
        showWhen: (v) => v.schedule === 'WEEKLY',
        options: WEEKDAYS.map((d) => ({ value: String(d), label: name(`weekdays.${d}`) })),
      },
      { name: 'dayFrom', kind: 'time', showWhen: (v) => v.schedule === 'WEEKLY' },
      { name: 'dayTo', kind: 'time', showWhen: (v) => v.schedule === 'WEEKLY' },
      { name: 'festivalId', kind: 'select', optionsFrom: choices.festivals },
      ...rule('alone'),
      ...rule('withKit'),
      { name: 'kitTiers', kind: 'textarea', wide: true, codec: tiersCodec },
      { name: 'everything', kind: 'switch', section: 'covers', defaultValue: false },
      { name: 'groupIds', kind: 'multiselect', optionsFrom: priceGroups },
      { name: 'categoryIds', kind: 'multiselect', optionsFrom: categories },
      { name: 'productIds', kind: 'multiselect', optionsFrom: choices.products },
      { name: 'variantIds', kind: 'multiselect', optionsFrom: choices.packs },
      { name: 'kitIds', kind: 'multiselect', optionsFrom: choices.kits },
      // The rest is out of the way until asked for.
      { name: 'more', kind: 'switch', section: 'extra', defaultValue: false },
      { name: 'titleNe', kind: 'text', max: 80, showWhen: (v) => v.more === true },
      { name: 'titleEn', kind: 'text', max: 80, showWhen: (v) => v.more === true },
      {
        name: 'allowCoupons',
        kind: 'switch',
        defaultValue: true,
        showWhen: (v) => v.more === true,
      },
      { name: 'isActive', kind: 'switch', defaultValue: true, showWhen: (v) => v.more === true },
      { name: 'priority', kind: 'number', defaultValue: '0', showWhen: (v) => v.more === true },
      {
        name: 'leaveOutProductIds',
        kind: 'multiselect',
        optionsFrom: choices.products,
        showWhen: (v) => v.more === true,
      },
      {
        name: 'leaveOutKitIds',
        kind: 'multiselect',
        optionsFrom: choices.kits,
        showWhen: (v) => v.more === true,
      },
      {
        name: 'leaveOutGroupIds',
        kind: 'multiselect',
        optionsFrom: priceGroups,
        showWhen: (v) => v.more === true,
      },
    ],
  };
}

export type { Offer as OfferRow };
export const offerPreview = (variantId: string) =>
  request<Schema<'PricePreviewResponse'>>('GET', `/admin/price-offers/preview/${variantId}`);
