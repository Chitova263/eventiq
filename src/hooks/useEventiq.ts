import { useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger.ts';

type EventHandler<T = unknown> = (data: T) => void;

interface EventiqOptions {
  maxListeners?: number;
}

export function useEventiq(options: EventiqOptions = {}) {
  const { maxListeners = 100 } = options;
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  const on = useCallback(
    <T = unknown>(event: string, handler: EventHandler<T>) => {
      const listeners = listenersRef.current;
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      const handlers = listeners.get(event)!;
      if (handlers.size >= maxListeners) {
        logger.warn(`Max listeners (${maxListeners}) reached for event "${event}"`);
        return () => {};
      }
      handlers.add(handler as EventHandler);

      return () => {
        handlers.delete(handler as EventHandler);
        if (handlers.size === 0) {
          listeners.delete(event);
        }
      };
    },
    [maxListeners],
  );

  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    const handlers = listenersRef.current.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }, []);

  const off = useCallback((event: string, handler?: EventHandler) => {
    const listeners = listenersRef.current;
    if (handler) {
      listeners.get(event)?.delete(handler);
    } else {
      listeners.delete(event);
    }
  }, []);

  const once = useCallback(
    <T = unknown>(event: string, handler: EventHandler<T>) => {
      const wrappedHandler: EventHandler<T> = (data) => {
        handler(data);
        off(event, wrappedHandler as EventHandler);
      };
      return on(event, wrappedHandler);
    },
    [on, off],
  );

  const clear = useCallback(() => {
    listenersRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      listenersRef.current.clear();
    };
  }, []);

  return { on, emit, off, once, clear };
}
