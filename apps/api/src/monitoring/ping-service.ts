import type { PingResult, PingTrigger } from '@bizscout/shared';
import type { NewPingRow, PingRow } from '../db/schema';
import type { AppEventBus } from '../events/app-events';
import type { Logger } from '../lib/logger';
import type { ProbeResult } from './httpbin-client';
import { generatePayload, type RandomPayload } from './payload-generator';
import { summarizeRow, toPingResult } from './ping-mapper';

export interface PingStore {
  insert(row: NewPingRow): Promise<PingRow | null>;
  existsForSlot(slotStart: Date): Promise<boolean>;
}

export interface Prober {
  readonly url: string;
  readonly method: string;
  send(payload: unknown): Promise<ProbeResult>;
}

export type RunOutcome =
  | { status: 'recorded'; ping: PingResult }
  | { status: 'skipped'; reason: 'in_flight' | 'already_recorded' };

export interface PingServiceDeps {
  store: PingStore;
  prober: Prober;
  bus: AppEventBus;
  logger: Logger;
  generatePayload?: () => RandomPayload;
  now?: () => Date;
}

/**
 * The monitoring pipeline: payload -> probe -> persist -> publish.
 *
 * Idempotency has two layers:
 *  1. in-process: a slot already being probed is not probed again (scheduler + cron racing);
 *  2. database: the unique index on slot_start makes a second insert a no-op (multiple processes).
 */
export class PingService {
  private readonly inFlightSlots = new Set<number>();
  private readonly makePayload: () => RandomPayload;
  private readonly now: () => Date;

  constructor(private readonly deps: PingServiceDeps) {
    this.makePayload = deps.generatePayload ?? (() => generatePayload());
    this.now = deps.now ?? (() => new Date());
  }

  async runSlot(slotStart: Date, trigger: Exclude<PingTrigger, 'manual'>): Promise<RunOutcome> {
    const key = slotStart.getTime();
    if (this.inFlightSlots.has(key)) return { status: 'skipped', reason: 'in_flight' };

    this.inFlightSlots.add(key);
    try {
      if (await this.deps.store.existsForSlot(slotStart)) {
        this.deps.logger.debug({ slotStart, trigger }, 'slot already recorded');
        return { status: 'skipped', reason: 'already_recorded' };
      }
      return await this.execute(trigger, slotStart);
    } finally {
      this.inFlightSlots.delete(key);
    }
  }

  /** Ad-hoc ping outside the schedule (demo button / E2E). Never deduplicated. */
  async runManual(): Promise<RunOutcome> {
    return this.execute('manual', null);
  }

  private async execute(trigger: PingTrigger, slotStart: Date | null): Promise<RunOutcome> {
    const payload = this.makePayload();
    const requestedAt = this.now();
    const probe = await this.deps.prober.send(payload);

    const row = await this.deps.store.insert({
      slotStart,
      trigger,
      requestedAt,
      targetUrl: this.deps.prober.url,
      method: this.deps.prober.method,
      requestPayload: payload,
      statusCode: probe.statusCode,
      ok: probe.ok,
      responseTimeMs: probe.responseTimeMs,
      responseSizeBytes: probe.responseSizeBytes,
      responseHeaders: probe.headers,
      responseBody: probe.body,
      errorCode: probe.errorCode,
      errorMessage: probe.errorMessage,
    });

    if (!row) {
      this.deps.logger.info({ slotStart, trigger }, 'slot recorded concurrently; discarding probe');
      return { status: 'skipped', reason: 'already_recorded' };
    }

    const ping = toPingResult(summarizeRow(row));
    const context = {
      pingId: ping.id,
      trigger,
      statusCode: ping.statusCode,
      responseTimeMs: ping.responseTimeMs,
      errorCode: ping.errorCode,
    };
    if (ping.ok) this.deps.logger.info(context, 'ping recorded');
    else this.deps.logger.warn(context, 'ping recorded with failure');

    void this.deps.bus.publish('ping.created', ping);
    return { status: 'recorded', ping };
  }
}
