import { describe, expect, it } from 'vitest';
import { SERVER_EVENT_TYPES, serverEventSchemas } from './index';

describe('serverEventSchemas', () => {
  it('lists every event type exactly once', () => {
    expect(SERVER_EVENT_TYPES).toEqual(Object.keys(serverEventSchemas));
  });

  it('validates ping.created payloads with the ping schema', () => {
    const result = serverEventSchemas['ping.created'].safeParse({ id: 'not-a-number' });
    expect(result.success).toBe(false);
  });
});
