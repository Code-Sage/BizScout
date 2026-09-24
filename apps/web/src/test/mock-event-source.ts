type Listener = (event: MessageEvent<string>) => void;

/** Minimal controllable EventSource for hook tests. */
export class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readyState = 0;
  closed = false;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  static latest(): MockEventSource {
    const instance = MockEventSource.instances.at(-1);
    if (!instance) throw new Error('No EventSource was created');
    return instance;
  }

  static reset(): void {
    MockEventSource.instances = [];
  }

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  emit(type: string, data: unknown, id = ''): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data), lastEventId: id });
    for (const listener of this.listeners.get(type) ?? []) listener(event as MessageEvent<string>);
  }

  fail(closed = false): void {
    this.readyState = closed ? 2 : 0;
    this.onerror?.(new Event('error'));
  }
}

export const mockEventSourceFactory = (url: string): EventSource =>
  new MockEventSource(url) as unknown as EventSource;
