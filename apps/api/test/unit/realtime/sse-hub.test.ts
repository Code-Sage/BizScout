import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatSseMessage } from '../../../src/realtime/sse';
import { SseHub, type SseClient } from '../../../src/realtime/sse-hub';
import { createCapturingLogger } from '../../support/logger';

class FakeClient implements SseClient {
  chunks: string[] = [];
  ended = false;
  failWrites = false;
  private closeListeners: Array<() => void> = [];

  write(chunk: string): boolean {
    if (this.failWrites) throw new Error('socket gone');
    this.chunks.push(chunk);
    return true;
  }
  end(): void {
    this.ended = true;
  }
  on(_event: 'close', listener: () => void): this {
    this.closeListeners.push(listener);
    return this;
  }
  close(): void {
    for (const listener of this.closeListeners) listener();
  }
}

describe('formatSseMessage', () => {
  it('renders id, event and a single JSON data line', () => {
    expect(formatSseMessage({ id: 5, event: 'ping.created', data: { a: 'x\ny' } })).toBe(
      'id: 5\nevent: ping.created\ndata: {"a":"x\\ny"}\n\n',
    );
  });

  it('omits the id line when there is no id', () => {
    expect(formatSseMessage({ event: 'alert.updated', data: 1 })).toBe(
      'event: alert.updated\ndata: 1\n\n',
    );
  });
});

describe('SseHub', () => {
  let hub: SseHub;
  beforeEach(() => {
    vi.useFakeTimers();
    hub = new SseHub(createCapturingLogger().logger, 25_000);
  });
  afterEach(() => {
    hub.stop();
    vi.useRealTimers();
  });

  it('broadcasts a formatted frame to every client', () => {
    const a = new FakeClient();
    const b = new FakeClient();
    hub.add(a);
    hub.add(b);

    hub.broadcast({ id: 1, event: 'ping.created', data: { id: 1 } });

    const frame = 'id: 1\nevent: ping.created\ndata: {"id":1}\n\n';
    expect(a.chunks).toEqual([frame]);
    expect(b.chunks).toEqual([frame]);
  });

  it('forgets a client when its connection closes', () => {
    const client = new FakeClient();
    hub.add(client);
    client.close();

    hub.broadcast({ event: 'x', data: 1 });

    expect(client.chunks).toEqual([]);
    expect(hub.size).toBe(0);
  });

  it('drops a client whose socket throws on write', () => {
    const broken = new FakeClient();
    broken.failWrites = true;
    const healthy = new FakeClient();
    hub.add(broken);
    hub.add(healthy);

    hub.broadcast({ event: 'x', data: 1 });

    expect(hub.size).toBe(1);
    expect(healthy.chunks).toHaveLength(1);
  });

  it('sends a heartbeat comment on an interval once started', () => {
    const client = new FakeClient();
    hub.add(client);
    hub.start();

    vi.advanceTimersByTime(25_000);

    expect(client.chunks).toEqual([': heartbeat\n\n']);
  });

  it('ends every client and clears the registry on stop', () => {
    const client = new FakeClient();
    hub.add(client);

    hub.stop();

    expect(client.ended).toBe(true);
    expect(hub.size).toBe(0);
  });
});
