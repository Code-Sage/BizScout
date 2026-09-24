import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { env } from '../../lib/env';
import { applyPingToCache } from '../pings/cache';
import { pingKeys } from '../pings/query-keys';
import { useConnectionStore } from './connection-store';
import { parseServerEvent } from './parse-server-event';

export type EventSourceFactory = (url: string) => EventSource;

const createEventSource: EventSourceFactory = (url) => new EventSource(url);
const EVENT_SOURCE_CLOSED = 2; // EventSource.CLOSED (not referenced directly: absent in test DOMs)
const INITIAL_RECONNECT_MS = 5_000;
const MAX_RECONNECT_MS = 60_000;

/**
 * Keeps the query cache in sync with the server's event stream. EventSource reconnects by itself
 * after network hiccups and sends Last-Event-ID, so the server replays what we missed. A fatal
 * error (e.g. a non-200 response from a proxy during a deploy) instead leaves the browser's
 * EventSource permanently CLOSED, so we detect that ourselves and reconnect with a backoff
 * (5s, doubling to a 60s cap, reset after a successful open). A fresh EventSource carries no
 * Last-Event-ID, so after any reconnect we also refetch every ping query as a safety net.
 */
export function useLiveStream(factory: EventSourceFactory = createEventSource): void {
  const queryClient = useQueryClient();
  const setStatus = useConnectionStore((state) => state.setStatus);
  const markEvent = useConnectionStore((state) => state.markEvent);

  useEffect(() => {
    let source: EventSource;
    let hasOpened = false;
    let reconnectMs = INITIAL_RECONNECT_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const onPingCreated = (event: MessageEvent<string>) => {
      const ping = parseServerEvent('ping.created', event.data);
      if (!ping) return;
      markEvent();
      applyPingToCache(queryClient, ping);
    };

    // Sets up one EventSource's handlers; called for the initial connection and every reconnect.
    const connect = () => {
      source = factory(`${env.apiBaseUrl}/api/stream`);
      setStatus('connecting');

      source.onopen = () => {
        if (hasOpened) void queryClient.invalidateQueries({ queryKey: pingKeys.all });
        hasOpened = true;
        reconnectMs = INITIAL_RECONNECT_MS;
        setStatus('open');
      };
      source.onerror = () => {
        if (source.readyState !== EVENT_SOURCE_CLOSED) {
          setStatus('reconnecting'); // transient: the browser will retry this same source itself
          return;
        }
        // Fatal: the browser has given up on this source for good. Reconnect ourselves.
        source.close();
        setStatus('reconnecting');
        const delay = reconnectMs;
        reconnectMs = Math.min(reconnectMs * 2, MAX_RECONNECT_MS);
        reconnectTimer = setTimeout(connect, delay);
      };
      source.addEventListener('ping.created', onPingCreated);
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source.removeEventListener('ping.created', onPingCreated);
      source.close();
      setStatus('closed');
    };
  }, [factory, queryClient, setStatus, markEvent]);
}
