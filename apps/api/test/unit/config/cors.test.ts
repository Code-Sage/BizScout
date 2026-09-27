import { describe, expect, it } from 'vitest';
import { parseCorsOrigins } from '../../../src/config/cors';

const allows = (origins: Array<string | RegExp>, origin: string) =>
  origins.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin),
  );

describe('parseCorsOrigins', () => {
  it('keeps exact origins as strings', () => {
    expect(parseCorsOrigins('https://a.app, https://b.app ,')).toEqual([
      'https://a.app',
      'https://b.app',
    ]);
  });

  it('turns a * into a single-DNS-label wildcard', () => {
    const origins = parseCorsOrigins('https://bizscout-monitor-*.vercel.app');
    expect(allows(origins, 'https://bizscout-monitor-git-feat-x-me.vercel.app')).toBe(true);
    expect(allows(origins, 'https://bizscout-monitor-a.evil.vercel.app')).toBe(false);
    expect(allows(origins, 'https://evil.com/?https://bizscout-monitor-a.vercel.app')).toBe(false);
    expect(allows(origins, 'https://bizscout-monitor-a.vercel.app.evil.com')).toBe(false);
  });

  it('escapes regex metacharacters in the literal parts', () => {
    const origins = parseCorsOrigins('https://x*.example.com');
    expect(allows(origins, 'https://xyzAexampleAcom')).toBe(false);
  });
});
