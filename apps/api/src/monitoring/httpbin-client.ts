import type { PingErrorCode } from '@bizscout/shared';

export interface ProbeResult {
  statusCode: number | null;
  ok: boolean;
  /** Time to last byte, integer milliseconds. */
  responseTimeMs: number;
  /** Decoded body size in bytes (not wire size). */
  responseSizeBytes: number | null;
  headers: Record<string, string> | null;
  body: unknown;
  errorCode: PingErrorCode | null;
  errorMessage: string | null;
}

export interface HttpbinClientOptions {
  url: string;
  timeoutMs: number;
  /** Monotonic clock in ms; injectable for deterministic tests. */
  now?: () => number;
}

/**
 * Sends one monitoring probe. Never throws: every failure mode is classified into a ProbeResult
 * so the caller can always persist what happened.
 */
export class HttpbinClient {
  readonly url: string;
  readonly method = 'POST' as const;
  private readonly timeoutMs: number;
  private readonly now: () => number;

  constructor(options: HttpbinClientOptions) {
    this.url = options.url;
    this.timeoutMs = options.timeoutMs;
    this.now = options.now ?? (() => performance.now());
  }

  async send(payload: unknown): Promise<ProbeResult> {
    const startedAt = this.now();
    const elapsed = (): number => Math.max(0, Math.round(this.now() - startedAt));

    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'user-agent': 'bizscout-monitor/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const text = await response.text();
      const base = {
        statusCode: response.status,
        responseTimeMs: elapsed(),
        responseSizeBytes: Buffer.byteLength(text, 'utf8'),
        headers: Object.fromEntries(response.headers.entries()),
      };

      // Body starts as raw text; only overwritten below on a successful JSON.parse. So on a parse
      // failure `body` is already the raw text we want to keep.
      let body: unknown = text;
      let jsonParseFailed = false;
      const declaresJson = (response.headers.get('content-type') ?? '').includes('json');
      if (declaresJson && text.length > 0) {
        try {
          body = JSON.parse(text);
        } catch {
          jsonParseFailed = true;
        }
      }

      // Non-2xx always wins: a proxy's malformed 502/504 body must not mask the outage as
      // INVALID_RESPONSE, since HTTP_ERROR is the signal the monitor exists to detect.
      if (!response.ok) {
        const statusText = response.statusText ? ` ${response.statusText}` : '';
        return {
          ...base,
          ok: false,
          body,
          errorCode: 'HTTP_ERROR',
          errorMessage: `HTTP ${response.status}${statusText}`,
        };
      }

      if (jsonParseFailed) {
        return {
          ...base,
          ok: false,
          body,
          errorCode: 'INVALID_RESPONSE',
          errorMessage: 'Response declared JSON but could not be parsed',
        };
      }

      return { ...base, ok: true, body, errorCode: null, errorMessage: null };
    } catch (error) {
      const failure = {
        statusCode: null,
        ok: false,
        responseTimeMs: elapsed(),
        responseSizeBytes: null,
        headers: null,
        body: null,
      };
      if (isTimeoutError(error)) {
        return {
          ...failure,
          errorCode: 'TIMEOUT',
          errorMessage: `Request timed out after ${this.timeoutMs}ms`,
        };
      }
      return { ...failure, errorCode: 'NETWORK_ERROR', errorMessage: describeError(error) };
    }
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  // undici wraps the real reason (ECONNREFUSED, ENOTFOUND, ...) in `cause`.
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : '';
  return `${error.message}${cause}`;
}
