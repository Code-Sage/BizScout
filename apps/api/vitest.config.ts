import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', LOG_LEVEL: 'silent' },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['test/unit/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          globalSetup: ['test/support/global-setup.ts'],
          // Files share one database and truncate it between tests, so run them one at a time.
          // (Per-project `fileParallelism: false` is not honoured in Vitest 3.2; a single fork is.)
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 15_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/db/migrate-cli.ts'],
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 80,
        branches: 80,
        // The core component (T6) is held to a higher bar.
        'src/monitoring/**': { lines: 95, statements: 95, functions: 95, branches: 85 },
      },
    },
  },
});
