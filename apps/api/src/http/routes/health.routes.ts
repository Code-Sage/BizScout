import { Router } from 'express';
import type { SchedulerStatus } from '../../monitoring/scheduler';

export interface HealthRouteDeps {
  version: string;
  checkDatabase: () => Promise<void>;
  schedulerStatus: () => SchedulerStatus;
  sseClients: () => number;
}

export function createHealthRouter(deps: HealthRouteDeps): Router {
  const router = Router();
  router.get('/health', async (_req, res) => {
    const database = await deps.checkDatabase().then(
      () => 'up' as const,
      () => 'down' as const,
    );
    res.status(database === 'up' ? 200 : 503).json({
      status: database === 'up' ? 'ok' : 'degraded',
      version: deps.version,
      uptimeSec: Math.round(process.uptime()),
      database,
      scheduler: deps.schedulerStatus(),
      sseClients: deps.sseClients(),
    });
  });
  return router;
}
