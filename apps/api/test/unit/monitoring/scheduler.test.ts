import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlotScheduler } from '../../../src/monitoring/scheduler';
import { createCapturingLogger } from '../../support/logger';

const FIVE_MIN = 300_000;
const START = new Date('2026-09-24T10:02:30.000Z');

function build(job: (slot: Date) => Promise<unknown>, runOnStart = false) {
  const { logger, entries } = createCapturingLogger();
  const scheduler = new SlotScheduler({
    name: 'ping',
    intervalMs: FIVE_MIN,
    job,
    logger,
    runOnStart,
  });
  return { scheduler, entries };
}

describe('SlotScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires exactly at the next wall-clock boundary with that slot', async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const { scheduler } = build(job);

    scheduler.start();
    expect(scheduler.status().nextRunAt).toBe('2026-09-24T10:05:00.000Z');

    await vi.advanceTimersByTimeAsync(149_999);
    expect(job).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(job).toHaveBeenCalledExactlyOnceWith(new Date('2026-09-24T10:05:00.000Z'));
    scheduler.stop();
  });

  it('keeps firing once per interval', async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const { scheduler } = build(job);

    scheduler.start();
    await vi.advanceTimersByTimeAsync(150_000 + 2 * FIVE_MIN);

    expect(job.mock.calls.map(([slot]) => (slot as Date).toISOString())).toEqual([
      '2026-09-24T10:05:00.000Z',
      '2026-09-24T10:10:00.000Z',
      '2026-09-24T10:15:00.000Z',
    ]);
    expect(scheduler.status().lastRunAt).toBe('2026-09-24T10:15:00.000Z');
    scheduler.stop();
  });

  it('runs a catch-up for the current slot on start when asked to', async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const { scheduler } = build(job, true);

    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(job).toHaveBeenCalledExactlyOnceWith(new Date('2026-09-24T10:00:00.000Z'));
    scheduler.stop();
  });

  it('survives a failing job, logs it and keeps its schedule', async () => {
    const job = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const { scheduler, entries } = build(job);

    scheduler.start();
    await vi.advanceTimersByTimeAsync(150_000);
    expect(scheduler.status().lastError).toBe('boom');
    expect(entries.some((entry) => entry.msg === 'scheduled job failed')).toBe(true);

    await vi.advanceTimersByTimeAsync(FIVE_MIN);
    expect(job).toHaveBeenCalledTimes(2);
    expect(scheduler.status().lastError).toBeNull();
    scheduler.stop();
  });

  it('stop() cancels pending runs', async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const { scheduler } = build(job);

    scheduler.start();
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(10 * FIVE_MIN);

    expect(job).not.toHaveBeenCalled();
    expect(scheduler.status()).toMatchObject({ running: false, nextRunAt: null });
  });

  it('re-arms for the same upcoming boundary after stop() and restart before it fires', async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const { scheduler } = build(job);

    scheduler.start();
    await vi.advanceTimersByTimeAsync(30_000); // 10:03:00, still before the 10:05:00 boundary
    scheduler.stop();

    await vi.advanceTimersByTimeAsync(30_000); // 10:03:30
    scheduler.start();
    expect(scheduler.status().nextRunAt).toBe('2026-09-24T10:05:00.000Z');

    await vi.advanceTimersByTimeAsync(90_000); // reach 10:05:00
    expect(job).toHaveBeenCalledExactlyOnceWith(new Date('2026-09-24T10:05:00.000Z'));
    scheduler.stop();
  });

  it('start() is idempotent', async () => {
    const job = vi.fn().mockResolvedValue(undefined);
    const { scheduler } = build(job);

    scheduler.start();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(150_000);

    expect(job).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('does not let a timer armed during stop()+start() of an in-flight run fire a job after the final stop()', async () => {
    let resolveJob: (() => void) | undefined;
    const job = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveJob = resolve;
        }),
    );
    const { scheduler } = build(job);

    scheduler.start();
    // Reach the 10:05:00 boundary: the job fires and stays pending (in flight).
    await vi.advanceTimersByTimeAsync(150_000);
    expect(job).toHaveBeenCalledTimes(1);

    // stop() + start() while that run is still in flight arms a second timer (for 10:10:00)
    // that the in-flight run's own `.finally` doesn't know about.
    scheduler.stop();
    scheduler.start();

    // Let the still-in-flight 10:05:00 run settle now, while the scheduler is running again:
    // its `.finally` calls back into scheduleNext(), which must not leak the 10:10:00 timer.
    resolveJob?.();
    await vi.advanceTimersByTimeAsync(0);

    scheduler.stop(); // the final stop()

    // Advance past several more boundaries. A leaked timer would fire the job again here.
    await vi.advanceTimersByTimeAsync(5 * FIVE_MIN);

    expect(job).toHaveBeenCalledTimes(1);
  });
});
