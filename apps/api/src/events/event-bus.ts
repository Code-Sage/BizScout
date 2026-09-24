import type { Logger } from '../lib/logger';

export type EventHandler<T> = (payload: T) => void | Promise<void>;

/**
 * Minimal typed in-process pub/sub. Decouples the ping pipeline from its consumers (SSE, anomaly
 * detection, ...). A failing subscriber is logged and never affects the publisher or its peers.
 * Single-instance by design; see ADR-0003 for the multi-instance path (Postgres LISTEN/NOTIFY).
 */
export class EventBus<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<EventHandler<never>>>();

  constructor(private readonly logger: Logger) {}

  subscribe<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): () => void {
    const handlers = this.handlers.get(type) ?? new Set<EventHandler<never>>();
    handlers.add(handler as EventHandler<never>);
    this.handlers.set(type, handlers);
    return () => {
      handlers.delete(handler as EventHandler<never>);
    };
  }

  /**
   * Resolves once every handler has settled. Publishers that must not wait (the ping pipeline)
   * call it fire-and-forget: `void bus.publish(...)`.
   */
  async publish<K extends keyof Events>(type: K, payload: Events[K]): Promise<void> {
    const handlers = [...(this.handlers.get(type) ?? [])] as EventHandler<Events[K]>[];
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          this.logger.error({ err: error, event: String(type) }, 'event handler failed');
        }
      }),
    );
  }
}
