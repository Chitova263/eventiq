import { useEffect, useRef } from 'react';
import type { ListenerMiddlewareInstance, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { EventiqSchedulingActions, EventiqStore } from '../types/event.ts';

export function createEventiqHooks<TEventName extends string>(
  listener: ListenerMiddlewareInstance<EventiqStore, ThunkDispatch<EventiqStore, unknown, UnknownAction>>,
  schedulingActions: EventiqSchedulingActions<TEventName>,
) {
  function useEventStarted(name: TEventName, callback: () => void | Promise<void>) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
      const unsubscribeListener = listener.startListening({
        actionCreator: schedulingActions.started,
        effect: (action) => {
          if (action.payload.event === name) {
            callbackRef.current();
          }
        },
      });
      return () => unsubscribeListener({ cancelActive: true });
    }, [name]);
  }

  function useEventSucceeded(name: TEventName, callback: () => void | Promise<void>) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
      const unsubscribeListener = listener.startListening({
        actionCreator: schedulingActions.succeeded,
        effect: (action) => {
          if (action.payload.event === name) {
            callbackRef.current();
          }
        },
      });
      return () => unsubscribeListener({ cancelActive: true });
    }, [name]);
  }

  return { useEventStarted, useEventSucceeded };
}
