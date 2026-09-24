import {
  serverEventSchemas,
  type ServerEventPayload,
  type ServerEventType,
} from '@bizscout/shared';

/** Parses and validates an SSE `data` string. Returns null (and drops the event) on any mismatch. */
export function parseServerEvent<T extends ServerEventType>(
  type: T,
  raw: string,
): ServerEventPayload<T> | null {
  try {
    const result = serverEventSchemas[type].safeParse(JSON.parse(raw));
    return result.success ? (result.data as ServerEventPayload<T>) : null;
  } catch {
    return null;
  }
}
