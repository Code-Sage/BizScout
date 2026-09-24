import { apiErrorBodySchema } from '@bizscout/shared';
import type { z } from 'zod';
import { env } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  signal?: AbortSignal;
  query?: Record<string, QueryValue>;
}

export function buildUrl(path: string, query: Record<string, QueryValue> = {}): string {
  const url = new URL(`${env.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

/** GET + JSON + contract validation. Every failure becomes an ApiError with a user-facing message. */
export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      signal: options.signal,
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    if (isAbortError(error)) throw error; // TanStack Query cancelled it: not a failure
    throw new ApiError(
      'Unable to reach the monitoring API. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = apiErrorBodySchema.safeParse(body);
    if (envelope.success) {
      const { code, message, requestId } = envelope.data.error;
      throw new ApiError(message, response.status, code, requestId);
    }
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      'HTTP_ERROR',
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      'The monitoring API returned an unexpected response.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
  return parsed.data;
}
