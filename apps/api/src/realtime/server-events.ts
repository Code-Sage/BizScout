import {
  serverEventSchemas,
  type ServerEventPayload,
  type ServerEventType,
} from '@bizscout/shared';
import type { SseMessage } from './sse';

/** Validates the payload against the shared contract before it leaves the server. */
export function toSseMessage<T extends ServerEventType>(
  type: T,
  payload: ServerEventPayload<T>,
  id?: number,
): SseMessage {
  const data = serverEventSchemas[type].parse(payload);
  return id === undefined ? { event: type, data } : { event: type, data, id };
}
