import type { PingErrorCode, PingTrigger } from '@bizscout/shared';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Literal tuples (not imported values) so drizzle-kit can load this file without resolving the
// workspace package at runtime; `satisfies` keeps them in sync with the shared contract.
const PING_TRIGGER_VALUES = [
  'scheduler',
  'external_cron',
  'manual',
] as const satisfies readonly PingTrigger[];
const PING_ERROR_CODE_VALUES = [
  'TIMEOUT',
  'NETWORK_ERROR',
  'HTTP_ERROR',
  'INVALID_RESPONSE',
] as const satisfies readonly PingErrorCode[];

export const pingResults = pgTable(
  'ping_results',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    /** Start of the 5-minute slot. NULL for manual pings. Unique => a slot is recorded at most once. */
    slotStart: timestamp('slot_start', { withTimezone: true }),
    trigger: text('trigger', { enum: PING_TRIGGER_VALUES }).notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull(),
    targetUrl: text('target_url').notNull(),
    method: text('method').notNull(),
    requestPayload: jsonb('request_payload').$type<Record<string, unknown>>().notNull(),
    statusCode: integer('status_code'),
    ok: boolean('ok').notNull(),
    responseTimeMs: integer('response_time_ms').notNull(),
    responseSizeBytes: integer('response_size_bytes'),
    responseHeaders: jsonb('response_headers').$type<Record<string, string>>(),
    responseBody: jsonb('response_body').$type<unknown>(),
    errorCode: text('error_code', { enum: PING_ERROR_CODE_VALUES }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ping_results_slot_start_key').on(table.slotStart),
    index('ping_results_requested_at_idx').on(table.requestedAt.desc()),
    index('ping_results_ok_requested_at_idx').on(table.ok, table.requestedAt),
  ],
);

export type PingRow = typeof pingResults.$inferSelect;
export type NewPingRow = typeof pingResults.$inferInsert;
