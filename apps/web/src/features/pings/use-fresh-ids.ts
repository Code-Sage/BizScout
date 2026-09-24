import type { PingResult } from '@bizscout/shared';
import { useEffect, useRef, useState } from 'react';

/**
 * Ids newer than anything present on first load, i.e. rows that arrived live. Older pages loaded
 * via "Load more" are never marked fresh because their ids are below the high-water mark.
 */
export function useFreshIds(rows: PingResult[]): Set<number> {
  const highWater = useRef<number | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (rows.length === 0) return;
    const maxId = Math.max(...rows.map((row) => row.id));
    if (highWater.current === null) {
      highWater.current = maxId;
      return;
    }
    const mark = highWater.current;
    const incoming = rows.filter((row) => row.id > mark).map((row) => row.id);
    if (incoming.length === 0) return;
    highWater.current = maxId;
    setFresh(new Set(incoming));
  }, [rows]);

  return fresh;
}
