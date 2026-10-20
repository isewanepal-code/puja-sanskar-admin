import { describe, expect, it } from 'vitest';

import { render } from '@/test/render';

import { JsonLd } from './json-ld';

describe('JsonLd', () => {
  it('cannot be broken out of by its data', () => {
    const { container } = render(<JsonLd data={{ name: '</script><script>alert(1)' }} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script?.innerHTML).not.toContain('</script>');
    expect(JSON.parse(script!.textContent!)).toEqual({ name: '</script><script>alert(1)' });
  });
});
