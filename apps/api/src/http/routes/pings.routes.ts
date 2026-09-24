import {
  STATS_WINDOW_MS,
  listPingsQuerySchema,
  statsQuerySchema,
  type PingListResponse,
  type PingSeriesResponse,
} from '@bizscout/shared';
import { Router } from 'express';
import { z } from 'zod';
import { NotFoundError } from '../../lib/errors';
import { toPingDetail, toPingResult, toPingStats } from '../../monitoring/ping-mapper';
import type { PingQueries } from '../../monitoring/ping-repository';

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export interface PingsRouteDeps {
  pings: PingQueries;
  now?: () => Date;
}

export function createPingsRouter({ pings, now = () => new Date() }: PingsRouteDeps): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = listPingsQuerySchema.parse(req.query);
    const page = await pings.list({
      limit: query.limit,
      cursor: query.cursor,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    const body: PingListResponse = {
      data: page.rows.map(toPingResult),
      nextCursor: page.nextCursor,
    };
    res.json(body);
  });

  // Declared before '/:id' so "stats" / "series" are not parsed as ids.
  router.get('/stats', async (req, res) => {
    const { window } = statsQuerySchema.parse(req.query);
    const to = now();
    const from = new Date(to.getTime() - STATS_WINDOW_MS[window]);
    res.json(toPingStats(window, await pings.stats(from, to)));
  });

  router.get('/series', async (req, res) => {
    const { window } = statsQuerySchema.parse(req.query);
    const to = now();
    const from = new Date(to.getTime() - STATS_WINDOW_MS[window]);
    const points = await pings.series(from, to);
    const body: PingSeriesResponse = {
      window,
      points: points.map((point) => ({
        t: point.requestedAt.toISOString(),
        ms: point.responseTimeMs,
        ok: point.ok,
      })),
    };
    res.json(body);
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParamsSchema.parse(req.params);
    const row = await pings.findById(id);
    if (!row) throw new NotFoundError(`Ping ${id} not found`);
    res.json(toPingDetail(row));
  });

  return router;
}
