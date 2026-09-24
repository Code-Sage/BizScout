import { Router } from 'express';
import type { Logger } from '../../lib/logger';
import { toPingResult } from '../../monitoring/ping-mapper';
import type { PingQueries } from '../../monitoring/ping-repository';
import { SSE_HEADERS, formatSseMessage } from '../../realtime/sse';
import type { SseHub } from '../../realtime/sse-hub';
import { toSseMessage } from '../../realtime/server-events';

export interface StreamRouteDeps {
  hub: SseHub;
  pings: Pick<PingQueries, 'listAfter'>;
  logger: Logger;
  replayLimit?: number;
}

export function createStreamRouter({
  hub,
  pings,
  logger,
  replayLimit = 100,
}: StreamRouteDeps): Router {
  const router = Router();

  router.get('/stream', async (req, res) => {
    res.writeHead(200, SSE_HEADERS);
    res.write('retry: 5000\n\n'); // EventSource reconnect delay
    // Register first so nothing published during the replay query is lost; the client dedupes by id.
    hub.add(res);

    const lastEventId = Number.parseInt(req.header('last-event-id') ?? '', 10);
    if (!Number.isSafeInteger(lastEventId) || lastEventId <= 0) return;

    try {
      const missed = await pings.listAfter(lastEventId, replayLimit);
      for (const row of missed) {
        res.write(formatSseMessage(toSseMessage('ping.created', toPingResult(row), row.id)));
      }
    } catch (error) {
      logger.error({ err: error, lastEventId }, 'failed to replay missed events');
    }
  });

  return router;
}
