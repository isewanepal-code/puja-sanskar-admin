import { describe, expect, it } from 'vitest';

import type { Resource } from '@/components/resource';
import {
  categoriesResource,
  materialsResource,
  sourcesResource,
  unitsResource,
} from '@/features/catalogue';
import { faqsResource, storiesResource } from '@/features/content';
import { mantrasResource } from '@/features/mantras';
import { panditsResource } from '@/features/marketing';
import { pujaGroupResource, ritualTypesResource } from '@/features/puja-groups';
import { pujasResource } from '@/features/pujas';
import {
  deliverySlotsResource,
  deliveryZonesResource,
  taxClassesResource,
} from '@/features/settings';
import { usersResource } from '@/features/staff-accounts';

import messages from './messages/en.json';

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
