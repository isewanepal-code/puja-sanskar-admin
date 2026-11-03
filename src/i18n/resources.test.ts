import { describe, expect, it } from 'vitest';

import type { Resource } from '@/components/resource';
import {
  categoriesResource,
  materialsResource,
  sourcesResource,
  unitsResource,
} from '@/features/catalogue';
import {
  articleCheckResource,
  articlesResource,
  articleStatusResource,
  bannersResource,
  faqsResource,
  festivalDatesResource,
  festivalPujasResource,
  festivalsResource,
  homeSectionsResource,
  reviewsResource,
  storiesResource,
} from '@/features/content';
import {
  cartActivityResource,
  cartsResource,
  customersResource,
  listRequestsResource,
  messagesResource,
  remindersResource,
} from '@/features/customers';
import { kitFromPujaResource, kitItemsResource, kitsResource } from '@/features/kits';
import { mantrasResource } from '@/features/mantras';
import { discountsResource, panditsResource } from '@/features/marketing';
import { pujaGroupResource, ritualTypesResource } from '@/features/puja-groups';
import {
  gradesResource,
  pairingsResource,
  productsResource,
  variantsResource,
  type Product,
} from '@/features/products';
import { pujasResource, requirementsResource, verifyResource } from '@/features/pujas';
import {
  businessProfileResource,
  deliverySlotsResource,
  deliveryZonesResource,
  shopSettingsResource,
  taxClassesResource,
} from '@/features/settings';
import {
  billsResource,
  deliveryFeeResource,
  issueBillResource,
  receivePaymentResource,
  refundResource,
  statusResource,
  voidBillResource,
  voidPaymentResource,
} from '@/features/sales';
import { usersResource } from '@/features/staff-accounts';
import { historyResource, movementResource, stockResource } from '@/features/stock';

import messages from './messages/en.json';

const ORDER = { id: 'o', nextStatuses: ['CONFIRMED'], deliveryQuoteNeeded: true } as never;
const ANY = { id: 'x' } as never;
const LEVEL = { variant: { id: 'v', sku: 'S' } } as never;
const PRODUCT = { id: 'p', grades: [], nameNe: 'p' } as unknown as Product;

// Every admin resource, so a label it shows can never be missing from the messages.
const RESOURCES: Resource<never>[] = [
  ritualTypesResource,
  pujaGroupResource(true),
  pujasResource(
    () => undefined,
    (kind) => kind,
  ),
  mantrasResource,
  categoriesResource(() => undefined),
  materialsResource,
  unitsResource,
  sourcesResource,
  faqsResource((key) => key),
  storiesResource((key) => key),
  panditsResource,
  taxClassesResource((key) => key),
  deliveryZonesResource,
  deliverySlotsResource,
  usersResource((key) => key),
  productsResource,
  variantsResource(PRODUCT),
  gradesResource(PRODUCT),
  pairingsResource(PRODUCT),
  stockResource(false),
  movementResource(LEVEL, (key) => key),
  historyResource(LEVEL, (key) => key),
  kitsResource((key) => key),
  kitFromPujaResource((key) => key),
  kitItemsResource('k'),
  requirementsResource('p', (key) => key),
  verifyResource('p', { id: 'r', material: { nameNe: 'x' } } as never, (key) => key),
  festivalsResource,
  festivalDatesResource(ANY, (key) => key),
  festivalPujasResource(ANY),
  articlesResource((key) => key),
  articleStatusResource(ANY, (key) => key),
  articleCheckResource(ANY, (key) => key),
  reviewsResource((key) => key),
  bannersResource((key) => key),
  homeSectionsResource((key) => key),
  discountsResource((key) => key),
  statusResource(ORDER, (key) => key),
  deliveryFeeResource(ORDER),
  receivePaymentResource(ORDER, (key) => key),
  refundResource(ORDER, (key) => key),
  voidPaymentResource(ANY),
  issueBillResource(ORDER),
  voidBillResource(ANY),
  billsResource((key) => key),
  businessProfileResource,
  shopSettingsResource((key) => key),
  customersResource('NEWEST', (key) => key),
  cartsResource((key) => key),
  cartActivityResource('c', (key) => key),
  listRequestsResource((key) => key),
  messagesResource((key) => key),
  remindersResource,
] as unknown as Resource<never>[];

const lookup = (path: string[]) =>
  path.reduce<unknown>(
    (node, key) => (node as Record<string, unknown> | undefined)?.[key],
    messages,
  );

describe('resource messages', () => {
  it.each(RESOURCES.map((resource) => [resource.key, resource]))(
    'should name everything %s shows',
    (key, resource) => {
      const base = ['resources', key];
      const missing = [
        ...['title', 'add', 'empty'].map((k) => [...base, k]),
        ...resource.fields.map((field) => [...base, 'fields', field.name]),
        ...resource.columns.map((column) => [...base, 'fields', column.key]),
        ...resource.fields.flatMap((field) =>
          field.section ? [[...base, 'sections', field.section]] : [],
        ),
      ].filter((path) => typeof lookup(path) !== 'string');
      expect(missing.map((path) => path.join('.'))).toEqual([]);
    },
  );

  it('should keep angle brackets out of messages, where next-intl reads them as tags', () => {
    expect(JSON.stringify(messages)).not.toMatch(/</);
  });
});
