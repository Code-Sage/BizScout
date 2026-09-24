import type { NewPingRow, PingRow } from '../../src/db/schema';
import type { ProbeResult } from '../../src/monitoring/httpbin-client';
import type { PingStore, Prober } from '../../src/monitoring/ping-service';

export function okProbe(overrides: Partial<ProbeResult> = {}): ProbeResult {
  return {
    statusCode: 200,
    ok: true,
    responseTimeMs: 180,
    responseSizeBytes: 640,
    headers: { 'content-type': 'application/json' },
    body: { json: {} },
    errorCode: null,
    errorMessage: null,
    ...overrides,
  };
}

export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** PingStore with the same slot-uniqueness semantics as the real table. */
export class InMemoryPingStore implements PingStore {
  readonly rows: PingRow[] = [];
  /** Next insert rejects with this error (then resets). */
  failNextInsert: Error | null = null;
  /** Simulates another process winning the ON CONFLICT race. */
  forceConflict = false;
  private nextId = 1;

  async insert(row: NewPingRow): Promise<PingRow | null> {
    if (this.failNextInsert) {
      const error = this.failNextInsert;
      this.failNextInsert = null;
      throw error;
    }
    const duplicate =
      row.slotStart != null &&
      this.rows.some((existing) => existing.slotStart?.getTime() === row.slotStart?.getTime());
    if (this.forceConflict || duplicate) return null;

    const stored: PingRow = {
      id: this.nextId++,
      slotStart: row.slotStart ?? null,
      trigger: row.trigger,
      requestedAt: row.requestedAt,
      targetUrl: row.targetUrl,
      method: row.method,
      requestPayload: row.requestPayload,
      statusCode: row.statusCode ?? null,
      ok: row.ok,
      responseTimeMs: row.responseTimeMs,
      responseSizeBytes: row.responseSizeBytes ?? null,
      responseHeaders: row.responseHeaders ?? null,
      responseBody: row.responseBody ?? null,
      errorCode: row.errorCode ?? null,
      errorMessage: row.errorMessage ?? null,
      createdAt: new Date(),
    };
    this.rows.push(stored);
    return stored;
  }

  async existsForSlot(slotStart: Date): Promise<boolean> {
    return this.rows.some((row) => row.slotStart?.getTime() === slotStart.getTime());
  }
}

export class FakeProber implements Prober {
  readonly url = 'http://httpbin.test/anything';
  readonly method = 'POST';
  readonly payloads: unknown[] = [];
  /** When set, send() waits for it: lets tests hold a probe "in flight". */
  gate: Promise<void> | null = null;

  constructor(public result: ProbeResult = okProbe()) {}

  async send(payload: unknown): Promise<ProbeResult> {
    this.payloads.push(payload);
    if (this.gate) await this.gate;
    return this.result;
  }
}
