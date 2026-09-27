/**
 * `.env` files are a local development convenience. Loading one under `NODE_ENV=test` would
 * silently pull in developer-only settings (e.g. `DATABASE_SSL=true` for a hosted Postgres) on
 * top of the environment the local E2E API sets explicitly, breaking it against local Docker
 * Postgres. CI never has a `.env` file, so it is unaffected either way.
 */
export function shouldLoadDotEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production' && nodeEnv !== 'test';
}
