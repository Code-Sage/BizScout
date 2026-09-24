import type { AppDeps } from '../../src/http/app';
import { createLogger } from '../../src/lib/logger';
import { disabledSchedulerStatus } from '../../src/monitoring/scheduler';
import { SseHub } from '../../src/realtime/sse-hub';

export const TEST_INTERNAL_TOKEN = 'test-internal-token-0123456789abcdef';

const unused = (): Promise<never> => Promise.reject(new Error('not wired in this test'));

/** Complete AppDeps with inert defaults; override only what a test exercises. */
export function buildAppDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  const logger = overrides.logger ?? createLogger({ level: 'silent', pretty: false });
  return {
    logger,
    corsOrigins: ['http://localhost:5173'],
    version: 'test',
    pings: { list: unused, listAfter: unused, findById: unused, stats: unused, series: unused },
    pingService: { runSlot: unused, runManual: unused },
    hub: new SseHub(logger),
    internalToken: TEST_INTERNAL_TOKEN,
    pingIntervalMs: 300_000,
    checkDatabase: async () => {},
    schedulerStatus: () => disabledSchedulerStatus(300_000),
    ...overrides,
  };
}
