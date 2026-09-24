import type { Logger } from '../lib/logger';
import { formatSseMessage, type SseMessage } from './sse';

/** The slice of an Express Response the hub needs (lets tests use a fake). */
export interface SseClient {
  write(chunk: string): boolean;
  end(): void;
  on(event: 'close', listener: () => void): unknown;
}

/** Registry of open SSE connections with broadcast and keep-alive heartbeats. */
export class SseHub {
  private readonly clients = new Set<SseClient>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly heartbeatMs = 25_000,
  ) {}

  get size(): number {
    return this.clients.size;
  }

  /** Heartbeats stop idle proxies (Render, corporate firewalls) from closing quiet streams. */
  start(): void {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => this.writeAll(': heartbeat\n\n'), this.heartbeatMs);
  }

  stop(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    for (const client of this.clients) client.end();
    this.clients.clear();
  }

  add(client: SseClient): () => void {
    this.clients.add(client);
    this.logger.debug({ clients: this.clients.size }, 'sse client connected');
    const remove = (): void => {
      if (this.clients.delete(client)) {
        this.logger.debug({ clients: this.clients.size }, 'sse client disconnected');
      }
    };
    client.on('close', remove);
    return remove;
  }

  broadcast(message: SseMessage): void {
    this.writeAll(formatSseMessage(message));
  }

  private writeAll(chunk: string): void {
    for (const client of this.clients) {
      try {
        client.write(chunk);
      } catch (error) {
        this.logger.warn({ err: error }, 'dropping sse client after write failure');
        this.clients.delete(client);
      }
    }
  }
}
