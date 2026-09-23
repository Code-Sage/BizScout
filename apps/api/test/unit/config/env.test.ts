import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../src/config/env';

const base = { DATABASE_URL: 'postgres://bizscout:bizscout@localhost:5432/bizscout' };

describe('loadEnv', () => {
  it('applies safe defaults', () => {
    const env = loadEnv(base);
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4000,
      LOG_LEVEL: 'info',
      DATABASE_SSL: false,
      HTTPBIN_URL: 'https://httpbin.org/anything',
      PING_INTERVAL_MS: 300_000,
      PING_TIMEOUT_MS: 10_000,
      SCHEDULER_ENABLED: true,
      RUN_MIGRATIONS_ON_BOOT: false,
      CORS_ORIGINS: ['http://localhost:5173'],
    });
    expect(env.INTERNAL_API_TOKEN).toBeUndefined();
  });

  it('parses comma-separated CORS origins and trims whitespace', () => {
    const env = loadEnv({ ...base, CORS_ORIGINS: 'https://a.app, https://b.app ,' });
    expect(env.CORS_ORIGINS).toEqual(['https://a.app', 'https://b.app']);
  });

  it('parses boolean strings', () => {
    const env = loadEnv({ ...base, DATABASE_SSL: 'true', SCHEDULER_ENABLED: 'false' });
    expect(env.DATABASE_SSL).toBe(true);
    expect(env.SCHEDULER_ENABLED).toBe(false);
  });

  it('treats empty strings as unset', () => {
    const env = loadEnv({ ...base, INTERNAL_API_TOKEN: '', PORT: '' });
    expect(env.INTERNAL_API_TOKEN).toBeUndefined();
    expect(env.PORT).toBe(4000);
  });

  it('names the offending variable when validation fails', () => {
    expect(() => loadEnv({ ...base, PORT: 'eighty' })).toThrow(/PORT/);
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects an internal token shorter than 24 characters', () => {
    expect(() => loadEnv({ ...base, INTERNAL_API_TOKEN: 'short' })).toThrow(/INTERNAL_API_TOKEN/);
  });
});
