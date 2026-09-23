import type { z } from 'zod';
import { pingResultSchema } from './pings';

/**
 * SSE event name -> schema of its `data` payload.
 * The API validates before broadcasting; the web app validates on receipt.
 */
export const serverEventSchemas = {
  'ping.created': pingResultSchema,
} as const;

export type ServerEventType = keyof typeof serverEventSchemas;
export type ServerEventPayload<T extends ServerEventType> = z.infer<(typeof serverEventSchemas)[T]>;

export const SERVER_EVENT_TYPES = Object.keys(serverEventSchemas) as ServerEventType[];
