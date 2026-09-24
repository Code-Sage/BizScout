import type { Logger } from '../lib/logger';
import { nextSlotAfter, slotStartFor } from './slots';

export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
}

export function disabledSchedulerStatus(intervalMs: number): SchedulerStatus {
  return {
    enabled: false,
    running: false,
    intervalMs,
    nextRunAt: null,
    lastRunAt: null,
    lastError: null,
  };
}

export interface SlotSchedulerOptions {
  name: string;
  intervalMs: number;
  job: (slotStart: Date) => Promise<unknown>;
  logger: Logger;
  /** Run the current slot immediately on start (catch-up after a restart or cold start). */
  runOnStart?: boolean;
  now?: () => number;
}

/**
 * Fires `job` at wall-clock slot boundaries (10:00, 10:05, ...) rather than "every N ms since
 * boot". Aligned slots make the slot a natural idempotency key shared with the external cron.
 * The next scheduled run starts only after the current one settles, so scheduled runs never
 * overlap each other. The `runOnStart` catch-up run fires outside that chain and may overlap
 * the first scheduled run, so `job` must tolerate concurrent runs for distinct slots.
 */
export class SlotScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private nextRunAt: Date | null = null;
  private lastRunAt: Date | null = null;
  private lastError: string | null = null;
  private lastScheduledSlot = 0;
  private readonly now: () => number;

  constructor(private readonly options: SlotSchedulerOptions) {
    this.now = options.now ?? Date.now;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.options.logger.info(
      { scheduler: this.options.name, intervalMs: this.options.intervalMs },
      'scheduler started',
    );
    if (this.options.runOnStart) {
      void this.fire(slotStartFor(new Date(this.now()), this.options.intervalMs));
    }
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.nextRunAt = null;
    this.lastScheduledSlot = 0;
  }

  status(): SchedulerStatus {
    return {
      enabled: true,
      running: this.running,
      intervalMs: this.options.intervalMs,
      nextRunAt: this.nextRunAt?.toISOString() ?? null,
      lastRunAt: this.lastRunAt?.toISOString() ?? null,
      lastError: this.lastError,
    };
  }

  private scheduleNext(): void {
    // A previous in-flight run's `.finally` can call back in here while a timer it didn't
    // arm is already pending (e.g. stop() -> start() while that run was still in flight);
    // clear it first so we never have two live chains racing each other.
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.running) return;
    const now = this.now();
    // Guard against a timer that fires a hair early re-scheduling the slot it just ran.
    const nextMs = Math.max(
      nextSlotAfter(new Date(now), this.options.intervalMs).getTime(),
      this.lastScheduledSlot + this.options.intervalMs,
    );
    this.lastScheduledSlot = nextMs;
    this.nextRunAt = new Date(nextMs);
    this.timer = setTimeout(() => {
      // Defense in depth: if a leaked timer ever did fire after stop(), don't run the job.
      if (!this.running) return;
      void this.fire(new Date(nextMs)).finally(() => {
        if (this.running) this.scheduleNext();
      });
    }, nextMs - now);
  }

  private async fire(slotStart: Date): Promise<void> {
    try {
      await this.options.job(slotStart);
      this.lastRunAt = new Date(this.now());
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.options.logger.error(
        { err: error, scheduler: this.options.name, slotStart },
        'scheduled job failed',
      );
    }
  }
}
