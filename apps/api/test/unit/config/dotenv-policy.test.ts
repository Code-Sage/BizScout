import { describe, expect, it } from 'vitest';
import { shouldLoadDotEnv } from '../../../src/config/dotenv-policy';

describe('shouldLoadDotEnv', () => {
  it('loads .env in development (including unset NODE_ENV)', () => {
    expect(shouldLoadDotEnv('development')).toBe(true);
    expect(shouldLoadDotEnv(undefined)).toBe(true);
  });

  it('skips .env in test, so the local E2E API is independent of apps/api/.env', () => {
    expect(shouldLoadDotEnv('test')).toBe(false);
  });

  it('skips .env in production', () => {
    expect(shouldLoadDotEnv('production')).toBe(false);
  });
});
