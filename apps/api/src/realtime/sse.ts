export interface SseMessage {
  event: string;
  data: unknown;
  id?: number | string;
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Disable proxy buffering (nginx-style proxies honour this) so events arrive immediately.
  'X-Accel-Buffering': 'no',
} as const;

/** JSON.stringify escapes newlines, so the payload always fits on a single `data:` line. */
export function formatSseMessage({ event, data, id }: SseMessage): string {
  const lines: string[] = [];
  if (id !== undefined) lines.push(`id: ${id}`);
  lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return `${lines.join('\n')}\n\n`;
}
