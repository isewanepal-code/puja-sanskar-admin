import { describe, expect, it } from 'vitest';

import { schemaFor, toBody, toFormValues } from './form-values';
import type { Field } from './types';

const fields: Field[] = [
  { name: 'code', kind: 'code', required: true, createOnly: true },
  { name: 'nameEn', kind: 'text', required: true, max: 10 },
  { name: 'summary', kind: 'textarea' },
  { name: 'slug', kind: 'slug' },
  { name: 'sortOrder', kind: 'number' },
  { name: 'aliases', kind: 'tags' },
  { name: 'isActive', kind: 'switch' },
];

describe('resource form values', () => {
  it('should fill a new form with empty text and switches on', () => {
    expect(toFormValues(fields)).toEqual({
      code: '',
      nameEn: '',
      summary: '',
      slug: '',
      sortOrder: '',
      aliases: '',
      isActive: true,
    });
  });

  it('should show a record the way the inputs hold it', () => {
    const values = toFormValues(fields, {
      code: 'U1',
      nameEn: 'Gram',
      summary: null,
      sortOrder: 3,
      aliases: ['g', 'gm'],
      isActive: false,
    });
    expect(values).toMatchObject({
      summary: '',
      sortOrder: '3',
      aliases: 'g, gm',
      isActive: false,
    });
  });

  it('should send what the API takes, clearing empty optional text', () => {
    const body = toBody(
      fields,
      {
        code: 'U1',
        nameEn: ' Gram ',
        summary: '',
        slug: '',
        sortOrder: '2',
        aliases: 'g, gm,',
        isActive: true,
      },
      'create',
    );
    expect(body).toEqual({
      code: 'U1',
      nameEn: 'Gram',
      summary: null,
      sortOrder: 2,
      aliases: ['g', 'gm'],
      isActive: true,
    });
  });

  it('should leave a fixed code out of an edit', () => {
    expect(
      toBody(fields, toFormValues(fields, { code: 'U1', nameEn: 'x' }), 'edit'),
    ).not.toHaveProperty('code');
  });

  it('should check the rules before anything is sent', () => {
    const schema = schemaFor(fields);
    const result = schema.safeParse({
      code: 'bad code',
      nameEn: 'far too long a name',
      summary: '',
      slug: 'Not A Slug',
      sortOrder: 'x',
      aliases: '',
      isActive: true,
    });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['code', 'nameEn', 'slug', 'sortOrder']));
    expect(paths).not.toContain('summary');
  });
});
