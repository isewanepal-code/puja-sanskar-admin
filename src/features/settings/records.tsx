import type { Resource } from '@/components/resource';
import { choices } from '@/lib/choices';

type Name = (key: string) => string;

const PHONE = { regex: /^\+?[0-9]{7,15}$/, message: 'Digits only, such as 9801234567' };

const record = (
  key: string,
  path: string,
  singleton: 'PUT' | 'PATCH',
  fields: Resource<never>['fields'],
): Resource<never> => ({
  key,
  path,
  singleton,
  list: 'all',
  rowId: () => '',
  rowLabel: () => '',
  columns: [],
  fields,
});

// Who the shop is on its bills, payment QR and chat links; billing waits for it.
export const businessProfileResource = record('businessProfile', '/admin/billing/profile', 'PUT', [
  { name: 'legalName', kind: 'text', required: true, max: 160, wide: true },
  { name: 'address', kind: 'text', required: true, max: 300, wide: true },
  { name: 'phone', kind: 'text', required: true, pattern: PHONE },
  { name: 'email', kind: 'text' },
  { name: 'panNumber', kind: 'text', pattern: { regex: /^\d{9}$/, message: 'A PAN is 9 digits' } },
  { name: 'vatRegistered', kind: 'switch', defaultValue: false },
  { name: 'qrPayload', kind: 'textarea', max: 512, section: 'payment' },
  { name: 'qrLabel', kind: 'text', max: 80 },
  { name: 'billFooter', kind: 'textarea', max: 300 },
  { name: 'whatsappNumber', kind: 'text', pattern: PHONE, section: 'chat' },
  { name: 'viberNumber', kind: 'text', pattern: PHONE },
  { name: 'messengerPage', kind: 'text' },
]);

// How the shop prices, discounts, delivers and rounds; one record, changed by settings:manage.
export function shopSettingsResource(name: Name): Resource<never> {
  const choose = <V extends string>(values: readonly V[], group: string) =>
    values.map((value) => ({ value, label: name(`${group}.${value}`) }));
  return record('shopSettings', '/admin/settings', 'PATCH', [
    { name: 'defaultTaxClassId', kind: 'select', optionsFrom: choices.taxClasses, section: 'tax' },
    { name: 'deliveryTaxClassId', kind: 'select', optionsFrom: choices.taxClasses },
    { name: 'pricesIncludeTax', kind: 'switch' },
    {
      name: 'totalRounding',
      kind: 'select',
      options: choose(['NONE', 'RUPEE', 'FIVE_RUPEES', 'TEN_RUPEES'] as const, 'rounding'),
    },
    {
      name: 'discountStacking',
      kind: 'select',
      section: 'discounts',
      options: choose(['BEST_ONLY', 'COUPON_WITH_AUTOMATIC'] as const, 'stacking'),
    },
    { name: 'counterDiscountMaxPercent', kind: 'percent' },
    { name: 'paymentWindowHours', kind: 'number', section: 'orders' },
    {
      name: 'unlistedAreaDelivery',
      kind: 'select',
      options: choose(['QUOTE', 'REFUSE'] as const, 'unlisted'),
    },
    { name: 'cashOnDeliveryMax', kind: 'money' },
    { name: 'cashOnDelivery', kind: 'switch' },
    { name: 'emailOrderUpdates', kind: 'switch' },
    { name: 'popularSearches', kind: 'tags', wide: true, section: 'search' },
  ]);
}
