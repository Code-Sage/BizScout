import { Writable } from 'node:stream';
import pino from 'pino';
import type { Logger } from '../../src/lib/logger';

export interface LogEntry {
  level: number;
  msg: string;
  [key: string]: unknown;
}

/** A real pino logger whose JSON lines are captured in memory for assertions. */
export function createCapturingLogger(): { logger: Logger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      entries.push(JSON.parse(chunk.toString()) as LogEntry);
      callback();
    },
  });
  return { logger: pino({ level: 'debug' }, stream), entries };
}

export const LOG_LEVEL = { debug: 20, info: 30, warn: 40, error: 50 } as const;
