import { defineConfig, devices } from '@playwright/test';
import { E2E_API_PORT, E2E_API_URL, E2E_INTERNAL_TOKEN, E2E_WEB_URL } from './support/env';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // One shared database and API: keep runs sequential and predictable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @bizscout/api serve',
      url: `${E2E_API_URL}/api/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(E2E_API_PORT),
        LOG_LEVEL: 'warn',
        DATABASE_URL:
          process.env.E2E_DATABASE_URL ??
          'postgres://bizscout:bizscout@localhost:5432/bizscout_test',
        HTTPBIN_URL: process.env.E2E_HTTPBIN_URL ?? 'http://localhost:8080/anything',
        SCHEDULER_ENABLED: 'false',
        RUN_MIGRATIONS_ON_BOOT: 'true',
        INTERNAL_API_TOKEN: E2E_INTERNAL_TOKEN,
        CORS_ORIGINS: E2E_WEB_URL,
      },
    },
    {
      // Production build + preview: E2E exercises what we deploy.
      command: 'pnpm --filter @bizscout/web build && pnpm --filter @bizscout/web preview',
      url: E2E_WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: { VITE_API_BASE_URL: E2E_API_URL },
    },
  ],
});
