import { useEffect, useState } from 'react';

/**
 * Re-renders the caller every `intervalMs`, returning the current time. Use it wherever a
 * relative-time display (e.g. "5 minutes ago") must stay fresh without any change in the
 * underlying data.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
