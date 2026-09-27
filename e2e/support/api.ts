import { expect, type APIRequestContext } from '@playwright/test';
import { E2E_API_URL, E2E_INTERNAL_TOKEN } from './env';

export interface RecordedPing {
  id: number;
  payloadEvent: string | null;
}

/** Records a ping immediately (bypassing the 5-minute schedule) and returns it. */
export async function triggerPing(request: APIRequestContext): Promise<RecordedPing> {
  const response = await request.post(`${E2E_API_URL}/api/internal/ping-now`, {
    headers: { 'x-internal-token': E2E_INTERNAL_TOKEN },
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = (await response.json()) as { status: 'recorded'; ping: RecordedPing };
  return body.ping;
}
