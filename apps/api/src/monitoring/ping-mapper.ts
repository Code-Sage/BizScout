import type { PingDetail, PingResult, PingStats, StatsWindow } from '@bizscout/shared';
import type { PingRow } from '../db/schema';
import type { PingStatsRow, PingSummaryRow } from './ping-repository';

export function summarizeRow(row: PingRow): PingSummaryRow {
  const event = row.requestPayload['event'];
  return {
    id: row.id,
    requestedAt: row.requestedAt,
    trigger: row.trigger,
    targetUrl: row.targetUrl,
    method: row.method,
    statusCode: row.statusCode,
    ok: row.ok,
    responseTimeMs: row.responseTimeMs,
    responseSizeBytes: row.responseSizeBytes,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    payloadEvent: typeof event === 'string' ? event : null,
  };
}

export function toPingResult(row: PingSummaryRow): PingResult {
  return {
    id: row.id,
    requestedAt: row.requestedAt.toISOString(),
    trigger: row.trigger,
    targetUrl: row.targetUrl,
    method: row.method,
    statusCode: row.statusCode,
    ok: row.ok,
    responseTimeMs: row.responseTimeMs,
    responseSizeBytes: row.responseSizeBytes,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    payloadEvent: row.payloadEvent,
  };
}

export function toPingDetail(row: PingRow): PingDetail {
  return {
    ...toPingResult(summarizeRow(row)),
    requestPayload: row.requestPayload,
    responseHeaders: row.responseHeaders ?? null,
    responseBody: row.responseBody ?? null,
  };
}

export function toPingStats(window: StatsWindow, row: PingStatsRow): PingStats {
  return {
    window,
    total: row.total,
    successCount: row.successCount,
    failureCount: row.total - row.successCount,
    successRate: row.total === 0 ? null : row.successCount / row.total,
    avgMs: row.avgMs,
    p50Ms: row.p50Ms,
    p95Ms: row.p95Ms,
    p99Ms: row.p99Ms,
    minMs: row.minMs,
    maxMs: row.maxMs,
    lastPingAt: row.lastPingAt?.toISOString() ?? null,
  };
}
