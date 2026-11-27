import { describe, expect, it } from 'vitest';

import { isSafeProxyPath, isSameOriginWrite, safeNextPath } from './request-guard';

const headers = (values: Record<string, string>) => new Headers(values);

describe('isSameOriginWrite', () => {
  it('should let reads through', () => {
    expect(isSameOriginWrite('GET', headers({ 'sec-fetch-site': 'cross-site' }))).toBe(true);
  });

  it('should refuse a write another site triggered', () => {
    expect(isSameOriginWrite('POST', headers({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(
      isSameOriginWrite('POST', headers({ origin: 'https://evil.test', host: 'admin.test' })),
    ).toBe(false);
  });

  it('should accept a write from the site itself, behind a proxy too', () => {
    expect(
      isSameOriginWrite(
        'DELETE',
        headers({
          origin: 'https://admin.test',
          host: 'internal:3000',
          'x-forwarded-host': 'admin.test',
          'sec-fetch-site': 'same-origin',
        }),
      ),
    ).toBe(true);
  });

  it('should accept a write with no browser headers at all', () => {
    expect(isSameOriginWrite('POST', headers({}))).toBe(true);
  });

  it('should refuse an unreadable origin', () => {
    expect(isSameOriginWrite('POST', headers({ origin: 'not a url', host: 'a.test' }))).toBe(false);
  });
});

describe('isSafeProxyPath', () => {
  it('should allow ordinary API paths', () => {
    expect(isSafeProxyPath(['api', 'v1', 'admin', 'orders', 'abc-123'])).toBe(true);
  });

  it.each([['..'], ['%2e%2e'], ['%2E.'], ['a%2Fb'], ['a%5Cb'], ['']])(
    'should refuse %s',
    (segment) => {
      expect(isSafeProxyPath(['api', 'v1', segment])).toBe(false);
    },
  );
});

describe('safeNextPath', () => {
  it('keeps a path on this site', () => {
    expect(safeNextPath('/kits?step=items')).toBe('/kits?step=items');
  });

  it.each(['//evil.com', '/\\evil.com', '/\t/evil.com', 'https://evil.com', 'evil.com', '', null])(
    'turns %j into the fallback',
    (next) => {
      expect(safeNextPath(next, '/home')).toBe('/home');
    },
  );
});
