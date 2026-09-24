import type { PingStatusFilter } from '@bizscout/shared';
import { and, asc, desc, eq, gt, gte, lt, lte, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client';
import { pingResults, type NewPingRow, type PingRow } from '../db/schema';

/** Lightweight projection for lists and events: no request/response bodies. */
const summaryColumns = {
  id: pingResults.id,
  requestedAt: pingResults.requestedAt,
  trigger: pingResults.trigger,
  targetUrl: pingResults.targetUrl,
  method: pingResults.method,
  statusCode: pingResults.statusCode,
  ok: pingResults.ok,
  responseTimeMs: pingResults.responseTimeMs,
  responseSizeBytes: pingResults.responseSizeBytes,
  errorCode: pingResults.errorCode,
  errorMessage: pingResults.errorMessage,
  // Matches summarizeRow(): only a string `event` is projected, never a stringified number/object.
  payloadEvent: sql<
    string | null
  >`case when jsonb_typeof(${pingResults.requestPayload} -> 'event') = 'string' then ${pingResults.requestPayload} ->> 'event' end`,
};

export type PingSummaryRow = Pick<
  PingRow,
  | 'id'
  | 'requestedAt'
  | 'trigger'
  | 'targetUrl'
  | 'method'
  | 'statusCode'
  | 'ok'
  | 'responseTimeMs'
  | 'responseSizeBytes'
  | 'errorCode'
  | 'errorMessage'
> & { payloadEvent: string | null };

export interface ListPingsOptions {
  limit: number;
  cursor?: number;
  status: PingStatusFilter;
  from?: Date;
  to?: Date;
}

export interface PingPage {
  rows: PingSummaryRow[];
  nextCursor: number | null;
}

export interface PingStatsRow {
  total: number;
  successCount: number;
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
  lastPingAt: Date | null;
}

export interface SeriesPoint {
  requestedAt: Date;
  responseTimeMs: number;
  ok: boolean;
}

const ONLY_SUCCESSFUL = sql`filter (where ${pingResults.ok})`;
const percentile = (fraction: number) =>
  sql<
    number | null
  >`(percentile_cont(${sql.raw(String(fraction))}) within group (order by ${pingResults.responseTimeMs}) ${ONLY_SUCCESSFUL})::int`;

export class PingRepository {
  constructor(private readonly db: Database) {}

  /** Returns null when the slot was already recorded (ON CONFLICT DO NOTHING). */
  async insert(row: NewPingRow): Promise<PingRow | null> {
    const [inserted] = await this.db
      .insert(pingResults)
      .values(row)
      .onConflictDoNothing({ target: pingResults.slotStart })
      .returning();
    return inserted ?? null;
  }

  async existsForSlot(slotStart: Date): Promise<boolean> {
    const rows = await this.db
      .select({ id: pingResults.id })
      .from(pingResults)
      .where(eq(pingResults.slotStart, slotStart))
      .limit(1);
    return rows.length > 0;
  }

  async findById(id: number): Promise<PingRow | null> {
    const [row] = await this.db.select().from(pingResults).where(eq(pingResults.id, id)).limit(1);
    return row ?? null;
  }

  /** Keyset pagination on id (stable under concurrent inserts, unlike OFFSET). */
  async list(options: ListPingsOptions): Promise<PingPage> {
    const conditions: SQL[] = [];
    if (options.cursor !== undefined) conditions.push(lt(pingResults.id, options.cursor));
    if (options.status === 'success') conditions.push(eq(pingResults.ok, true));
    if (options.status === 'failure') conditions.push(eq(pingResults.ok, false));
    if (options.from) conditions.push(gte(pingResults.requestedAt, options.from));
    if (options.to) conditions.push(lte(pingResults.requestedAt, options.to));

    const rows = await this.db
      .select(summaryColumns)
      .from(pingResults)
      .where(and(...conditions))
      .orderBy(desc(pingResults.id))
      .limit(options.limit + 1);

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    return { rows: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  }

  /** Pings recorded after `afterId`, oldest first: replays SSE events a client missed. */
  async listAfter(afterId: number, limit: number): Promise<PingSummaryRow[]> {
    return this.db
      .select(summaryColumns)
      .from(pingResults)
      .where(gt(pingResults.id, afterId))
      .orderBy(asc(pingResults.id))
      .limit(limit);
  }

  /** Latency aggregates cover successful pings only; counts cover everything. */
  async stats(from: Date, to: Date): Promise<PingStatsRow> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        successCount: sql<number>`(count(*) ${ONLY_SUCCESSFUL})::int`,
        avgMs: sql<
          number | null
        >`round(avg(${pingResults.responseTimeMs}) ${ONLY_SUCCESSFUL})::int`,
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        minMs: sql<number | null>`(min(${pingResults.responseTimeMs}) ${ONLY_SUCCESSFUL})::int`,
        maxMs: sql<number | null>`(max(${pingResults.responseTimeMs}) ${ONLY_SUCCESSFUL})::int`,
        lastPingAt: sql<Date | null>`max(${pingResults.requestedAt})`.mapWith(
          pingResults.requestedAt,
        ),
      })
      .from(pingResults)
      .where(and(gte(pingResults.requestedAt, from), lte(pingResults.requestedAt, to)));

    return (
      row ?? {
        total: 0,
        successCount: 0,
        avgMs: null,
        p50Ms: null,
        p95Ms: null,
        p99Ms: null,
        minMs: null,
        maxMs: null,
        lastPingAt: null,
      }
    );
  }

  async series(from: Date, to: Date, limit = 5_000): Promise<SeriesPoint[]> {
    return this.db
      .select({
        requestedAt: pingResults.requestedAt,
        responseTimeMs: pingResults.responseTimeMs,
        ok: pingResults.ok,
      })
      .from(pingResults)
      .where(and(gte(pingResults.requestedAt, from), lte(pingResults.requestedAt, to)))
      .orderBy(asc(pingResults.requestedAt))
      .limit(limit);
  }
}

/** Read-side surface the HTTP layer depends on (lets unit tests pass a stub). */
export type PingQueries = Pick<
  PingRepository,
  'list' | 'listAfter' | 'findById' | 'stats' | 'series'
>;
