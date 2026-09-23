import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  APP_VERSION: z.string().default('dev'),

  DATABASE_URL: z.string({ error: 'DATABASE_URL is required' }).min(1),
  DATABASE_SSL: z.stringbool().default(false),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  MIGRATIONS_DIR: z.string().default('./drizzle'),
  RUN_MIGRATIONS_ON_BOOT: z.stringbool().default(false),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  HTTPBIN_URL: z.url().default('https://httpbin.org/anything'),
  PING_INTERVAL_MS: z.coerce.number().int().min(1_000).default(300_000),
  PING_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(10_000),
  SCHEDULER_ENABLED: z.stringbool().default(true),

  INTERNAL_API_TOKEN: z
    .string()
    .min(24, 'INTERNAL_API_TOKEN must be at least 24 characters')
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

/** `FOO=` in a .env file means "unset", not "empty string". */
function dropEmptyValues(source: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '',
    ),
  );
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(dropEmptyValues(source));
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
