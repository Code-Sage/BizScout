import { Router } from 'express';
import type { PingService } from '../../monitoring/ping-service';
import { slotStartFor } from '../../monitoring/slots';
import { requireInternalToken } from '../middleware/internal-auth';

export interface InternalRouteDeps {
  pingService: Pick<PingService, 'runSlot' | 'runManual'>;
  intervalMs: number;
  internalToken: string | undefined;
  now?: () => Date;
}

export function createInternalRouter({
  pingService,
  intervalMs,
  internalToken,
  now = () => new Date(),
}: InternalRouteDeps): Router {
  const router = Router();
  router.use(requireInternalToken(internalToken));

  /** Called by an external cron every 5 minutes: wakes a sleeping dyno and backfills the slot. */
  router.post('/tick', async (_req, res) => {
    const outcome = await pingService.runSlot(slotStartFor(now(), intervalMs), 'external_cron');
    res.status(outcome.status === 'recorded' ? 201 : 200).json(outcome);
  });

  router.post('/ping-now', async (_req, res) => {
    res.status(201).json(await pingService.runManual());
  });

  return router;
}
