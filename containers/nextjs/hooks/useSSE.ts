'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export function useSSE<T>(url: string, enabled: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost, reconnecting...');
    };

    es.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data));
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [url, enabled, disconnect]);

  return { data, connected, error, disconnect };
}
