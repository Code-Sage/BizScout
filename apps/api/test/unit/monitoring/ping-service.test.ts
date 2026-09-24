import type { PingResult } from '@bizscout/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppEvents } from '../../../src/events/app-events';
import { EventBus } from '../../../src/events/event-bus';
import { createSeededRng, generatePayload } from '../../../src/monitoring/payload-generator';
import { PingService } from '../../../src/monitoring/ping-service';
import { deferred, FakeProber, InMemoryPingStore, okProbe } from '../../support/fakes';
import { createCapturingLogger } from '../../support/logger';

const SLOT = new Date('2026-09-24T10:05:00.000Z');
const NOW = new Date('2026-09-24T10:05:00.250Z');

function setup() {
  const { logger, entries } = createCapturingLogger();
  const store = new InMemoryPingStore();
  const prober = new FakeProber();
  const bus = new EventBus<AppEvents>(logger);
  const published: PingResult[] = [];
  bus.subscribe('ping.created', (ping) => void published.push(ping));
  const rng = createSeededRng(123);
  const service = new PingService({
    store,
    prober,
    bus,
    logger,
    generatePayload: () => generatePayload(rng, NOW),
    now: () => NOW,
  });
  return { service, store, prober, published, entries };
}

/** Lets the fire-and-forget publish reach subscribers. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('PingService.runSlot', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('probes with a fresh payload and records the full result', async () => {
    const outcome = await ctx.service.runSlot(SLOT, 'scheduler');

    expect(outcome.status).toBe('recorded');
    expect(ctx.prober.payloads).toHaveLength(1);
    expect(ctx.store.rows).toHaveLength(1);
    expect(ctx.store.rows[0]).toMatchObject({
      slotStart: SLOT,
      trigger: 'scheduler',
      requestedAt: NOW,
      targetUrl: 'http://httpbin.test/anything',
      method: 'POST',
      requestPayload: ctx.prober.payloads[0],
      statusCode: 200,
      ok: true,
      responseTimeMs: 180,
    });
  });

  it('publishes ping.created with the public DTO', async () => {
    const outcome = await ctx.service.runSlot(SLOT, 'scheduler');
    await flush();

    expect(ctx.published).toHaveLength(1);
    expect(outcome).toEqual({ status: 'recorded', ping: ctx.published[0] });
    expect(ctx.published[0]).toMatchObject({
      id: 1,
      requestedAt: NOW.toISOString(),
      trigger: 'scheduler',
      payloadEvent: expect.any(String),
    });
  });

  it('records failed probes too, so outages are visible', async () => {
    ctx.prober.result = okProbe({
      ok: false,
      statusCode: null,
      responseSizeBytes: null,
      headers: null,
      body: null,
      responseTimeMs: 10_000,
      errorCode: 'TIMEOUT',
      errorMessage: 'Request timed out after 10000ms',
    });

    const outcome = await ctx.service.runSlot(SLOT, 'scheduler');
    await flush();

    expect(outcome.status).toBe('recorded');
    expect(ctx.store.rows[0]).toMatchObject({ ok: false, errorCode: 'TIMEOUT' });
    expect(ctx.published[0]).toMatchObject({ ok: false, errorCode: 'TIMEOUT' });
    expect(ctx.entries.some((entry) => entry.msg === 'ping recorded with failure')).toBe(true);
  });

  it('skips a slot that is already recorded without probing', async () => {
    await ctx.service.runSlot(SLOT, 'scheduler');

    const outcome = await ctx.service.runSlot(SLOT, 'external_cron');

    expect(outcome).toEqual({ status: 'skipped', reason: 'already_recorded' });
    expect(ctx.prober.payloads).toHaveLength(1);
  });

  it('refuses a concurrent run of the same slot while one is in flight', async () => {
    const gate = deferred();
    ctx.prober.gate = gate.promise;

    const first = ctx.service.runSlot(SLOT, 'scheduler');
    const second = await ctx.service.runSlot(SLOT, 'external_cron');
    gate.resolve();

    expect(second).toEqual({ status: 'skipped', reason: 'in_flight' });
    expect((await first).status).toBe('recorded');
    expect(ctx.prober.payloads).toHaveLength(1);
  });

  it('allows different slots to run concurrently', async () => {
    const next = new Date(SLOT.getTime() + 300_000);
    const [a, b] = await Promise.all([
      ctx.service.runSlot(SLOT, 'scheduler'),
      ctx.service.runSlot(next, 'scheduler'),
    ]);
    expect([a.status, b.status]).toEqual(['recorded', 'recorded']);
  });

  it('treats losing the insert race as already recorded and publishes nothing', async () => {
    ctx.store.forceConflict = true;

    const outcome = await ctx.service.runSlot(SLOT, 'scheduler');
    await flush();

    expect(outcome).toEqual({ status: 'skipped', reason: 'already_recorded' });
    expect(ctx.published).toHaveLength(0);
  });

  it('propagates storage failures and releases the slot for a retry', async () => {
    ctx.store.failNextInsert = new Error('db down');

    await expect(ctx.service.runSlot(SLOT, 'scheduler')).rejects.toThrow('db down');
    const retry = await ctx.service.runSlot(SLOT, 'scheduler');

    expect(retry.status).toBe('recorded');
  });
});

describe('PingService.runManual', () => {
  it('records every manual ping with a null slot', async () => {
    const ctx = setup();

    await ctx.service.runManual();
    await ctx.service.runManual();

    expect(ctx.store.rows).toHaveLength(2);
    expect(ctx.store.rows.every((row) => row.slotStart === null && row.trigger === 'manual')).toBe(
      true,
    );
  });
});
