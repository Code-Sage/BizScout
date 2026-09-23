import { z } from 'zod';

export const PING_TRIGGERS = ['scheduler', 'external_cron', 'manual'] as const;
export const pingTriggerSchema = z.enum(PING_TRIGGERS);
export type PingTrigger = z.infer<typeof pingTriggerSchema>;

export const PING_ERROR_CODES = [
  'TIMEOUT',
  'NETWORK_ERROR',
  'HTTP_ERROR',
  'INVALID_RESPONSE',
] as const;
export const pingErrorCodeSchema = z.enum(PING_ERROR_CODES);
export type PingErrorCode = z.infer<typeof pingErrorCodeSchema>;

/** One row of the history table and the payload of the `ping.created` SSE event. */
export const pingResultSchema = z.object({
  id: z.number().int().positive(),
  requestedAt: z.iso.datetime(),
  trigger: pingTriggerSchema,
  targetUrl: z.string(),
  method: z.string(),
  statusCode: z.number().int().nullable(),
  ok: z.boolean(),
  responseTimeMs: z.number().int().nonnegative(),
  responseSizeBytes: z.number().int().nonnegative().nullable(),
  errorCode: pingErrorCodeSchema.nullable(),
  errorMessage: z.string().nullable(),
  payloadEvent: z.string().nullable(),
});
export type PingResult = z.infer<typeof pingResultSchema>;

/** Full record for the detail drawer: adds the request payload and the raw response. */
export const pingDetailSchema = pingResultSchema.extend({
  requestPayload: z.record(z.string(), z.unknown()),
  responseHeaders: z.record(z.string(), z.string()).nullable(),
  responseBody: z.unknown(),
});
export type PingDetail = z.infer<typeof pingDetailSchema>;

export const PING_STATUS_FILTERS = ['all', 'success', 'failure'] as const;
export const pingStatusFilterSchema = z.enum(PING_STATUS_FILTERS);
export type PingStatusFilter = z.infer<typeof pingStatusFilterSchema>;

export const listPingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.coerce.number().int().positive().optional(),
  status: pingStatusFilterSchema.default('all'),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type ListPingsQuery = z.infer<typeof listPingsQuerySchema>;

export const pingListResponseSchema = z.object({
  data: z.array(pingResultSchema),
  nextCursor: z.number().int().positive().nullable(),
});
export type PingListResponse = z.infer<typeof pingListResponseSchema>;

export const STATS_WINDOWS = ['1h', '24h', '7d'] as const;
export const statsWindowSchema = z.enum(STATS_WINDOWS);
export type StatsWindow = z.infer<typeof statsWindowSchema>;

export const STATS_WINDOW_MS: Record<StatsWindow, number> = {
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 604_800_000,
};

export const statsQuerySchema = z.object({ window: statsWindowSchema.default('24h') });

const nullableMs = z.number().int().nullable();

export const pingStatsSchema = z.object({
  window: statsWindowSchema,
  total: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1).nullable(),
  avgMs: nullableMs,
  p50Ms: nullableMs,
  p95Ms: nullableMs,
  p99Ms: nullableMs,
  minMs: nullableMs,
  maxMs: nullableMs,
  lastPingAt: z.iso.datetime().nullable(),
});
export type PingStats = z.infer<typeof pingStatsSchema>;

export const pingSeriesPointSchema = z.object({
  t: z.iso.datetime(),
  ms: z.number().int().nonnegative(),
  ok: z.boolean(),
});
export type PingSeriesPoint = z.infer<typeof pingSeriesPointSchema>;

export const pingSeriesResponseSchema = z.object({
  window: statsWindowSchema,
  points: z.array(pingSeriesPointSchema),
});
export type PingSeriesResponse = z.infer<typeof pingSeriesResponseSchema>;
