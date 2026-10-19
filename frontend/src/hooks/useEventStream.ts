import { useState, useEffect, useRef, useCallback } from 'react';
import type { MissionEvent } from '@/types';
import { getEvents } from '@/lib/api';

export type StreamStatus = 'connected' | 'connecting' | 'disconnected' | 'fallback_polling';

interface UseEventStreamOptions {
  enabled?: boolean;
  onNewEvent?: (event: MissionEvent) => void;
  maxStoredEvents?: number;
}

export function useEventStream(options: UseEventStreamOptions = {}) {
  const { enabled = true, onNewEvent, maxStoredEvents = 30 } = options;
  const [status, setStatus] = useState<StreamStatus>('disconnected');
  const [liveEvents, setLiveEvents] = useState<MissionEvent[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const addEvent = useCallback((event: MissionEvent) => {
    setLiveEvents((prev) => {
      // Deduplicate by id or source_id
      if (prev.some((e) => e.id === event.id || (e.source === event.source && e.source_id === event.source_id))) {
        return prev;
      }
      const updated = [event, ...prev];
      return updated.slice(0, maxStoredEvents);
    });
    if (onNewEvent) {
      onNewEvent(event);
    }
  }, [maxStoredEvents, onNewEvent]);

  // Fallback Polling Function
  const pollLatestEvents = useCallback(async () => {
    try {
      const res = await getEvents({ limit: 10 });
      if (res.success && Array.isArray(res.data)) {
        res.data.forEach((evt) => addEvent(evt));
      }
    } catch {
      // Ignore polling errors
    }
  }, [addEvent]);

  const connect = useCallback(() => {
    if (!enabled) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');

    try {
      const es = new EventSource('/api/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus('connected');
        retryCountRef.current = 0;
        setLastHeartbeat(new Date());

        // Stop fallback polling if running
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      // Listen for named event 'event.created'
      es.addEventListener('event.created', (e: MessageEvent) => {
        setLastHeartbeat(new Date());
        try {
          const parsed = JSON.parse(e.data);
          if (parsed) addEvent(parsed);
        } catch (err) {
          console.warn('[SSE] Failed to parse event.created payload:', err);
        }
      });

      // Also listen for standard message event
      es.onmessage = (e: MessageEvent) => {
        setLastHeartbeat(new Date());
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && (parsed.type === 'event.created' || parsed.id)) {
            addEvent(parsed.data || parsed);
          }
        } catch {
          // heartbeat or ping
        }
      };

      es.onerror = () => {
        setStatus('disconnected');
        es.close();
        eventSourceRef.current = null;

        retryCountRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);

        // If disconnected multiple times, start fallback polling
        if (retryCountRef.current >= 2 && !pollingIntervalRef.current) {
          setStatus('fallback_polling');
          pollLatestEvents();
          pollingIntervalRef.current = setInterval(pollLatestEvents, 15000);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setStatus('fallback_polling');
      if (!pollingIntervalRef.current) {
        pollLatestEvents();
        pollingIntervalRef.current = setInterval(pollLatestEvents, 15000);
      }
    }
  }, [enabled, addEvent, pollLatestEvents]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enabled, connect]);

  return {
    status,
    liveEvents,
    lastHeartbeat,
    setLiveEvents,
    reconnect: connect,
  };
}
