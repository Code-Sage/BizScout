const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Comma-separated origins. A `*` matches exactly one DNS label segment, so
 * `https://bizscout-monitor-*.vercel.app` admits Vercel preview URLs without admitting
 * `https://bizscout-monitor-x.evil.vercel.app`.
 */
export function parseCorsOrigins(value: string): Array<string | RegExp> {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) =>
      origin.includes('*')
        ? new RegExp(`^${origin.split('*').map(escapeRegExp).join('[a-z0-9-]+')}$`)
        : origin,
    );
}
