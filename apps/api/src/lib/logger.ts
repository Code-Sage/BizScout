import pino, { type Logger } from 'pino';

export type { Logger };

export interface LoggerOptions {
  level: string;
  /** Human-readable output for local development; JSON otherwise. */
  pretty: boolean;
}

export function createLogger({ level, pretty }: LoggerOptions): Logger {
  return pino({
    level,
    base: { service: 'bizscout-api' },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-internal-token"]'],
      remove: true,
    },
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });
}
