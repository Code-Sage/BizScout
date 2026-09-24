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

/**
 * Keeps the query cache in sync with the server's event stream. EventSource reconnects by itself
 * and sends Last-Event-ID, so the server replays what we missed; after a reconnect we also refetch
 * lists as a safety net for longer outages.
 */
export function useLiveStream(factory: EventSourceFactory = createEventSource): void {
  const queryClient = useQueryClient();
  const setStatus = useConnectionStore((state) => state.setStatus);
  const markEvent = useConnectionStore((state) => state.markEvent);

  useEffect(() => {
    const source = factory(`${env.apiBaseUrl}/api/stream`);
    let hasOpened = false;
    setStatus('connecting');

    source.onopen = () => {
      if (hasOpened) void queryClient.invalidateQueries({ queryKey: pingKeys.lists() });
      hasOpened = true;
      setStatus('open');
    };
    source.onerror = () => {
      setStatus(source.readyState === EVENT_SOURCE_CLOSED ? 'closed' : 'reconnecting');
    };

    const onPingCreated = (event: MessageEvent<string>) => {
      const ping = parseServerEvent('ping.created', event.data);
      if (!ping) return;
      markEvent();
      applyPingToCache(queryClient, ping);
    };
    source.addEventListener('ping.created', onPingCreated);

    return () => {
      source.removeEventListener('ping.created', onPingCreated);
      source.close();
      setStatus('closed');
    };
  }, [factory, queryClient, setStatus, markEvent]);
}
