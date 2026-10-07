import { describe, expect, it } from 'vitest';

import en from './messages/en.json';
import ne from './messages/ne.json';

function flattenKeys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('messages', () => {
  it('keeps every locale in sync with the default locale', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(ne).sort());
  });
});
