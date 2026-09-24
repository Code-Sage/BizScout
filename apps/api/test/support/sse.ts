export interface ReceivedSseEvent {
  event: string;
  id?: string;
  data: unknown;
}

function parseFrame(frame: string): ReceivedSseEvent | null {
  let event = 'message';
  let id: string | undefined;
  const data: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith(':')) continue; // comment / heartbeat
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'id') id = value;
    else if (field === 'data') data.push(value);
  }
  if (data.length === 0) return null; // e.g. the initial `retry:` frame
  return { event, id, data: JSON.parse(data.join('\n')) };
}

/**
 * Opens an SSE stream with fetch and collects `count` data events (or throws on timeout).
 * `onOpen` runs once response headers arrive, which is when the server has registered the client.
 */
export async function collectSseEvents(
  url: string,
  options: {
    count: number;
    headers?: Record<string, string>;
    timeoutMs?: number;
    onOpen?: () => unknown;
  },
): Promise<{ events: ReceivedSseEvent[]; headers: Headers }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
  const events: ReceivedSseEvent[] = [];
  try {
    const response = await fetch(url, { headers: options.headers, signal: controller.signal });
    await options.onOpen?.();
    if (!response.body) throw new Error('SSE response has no body');
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (events.length < options.count) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const parsed = parseFrame(buffer.slice(0, boundary));
        if (parsed) events.push(parsed);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
    return { events, headers: response.headers };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
