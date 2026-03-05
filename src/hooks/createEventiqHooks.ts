import { useEffect, useRef } from 'react';
import type { ListenerMiddlewareInstance, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import type { EventiqEventSchedularActions, EventiqStore } from '../types/planEvent.ts';

export function createEventiqHooks<TEventName extends string>(
  listener: ListenerMiddlewareInstance<EventiqStore, ThunkDispatch<EventiqStore, unknown, UnknownAction>>,
  schedulingActions: EventiqEventSchedularActions<TEventName>,
) {
  function useEventStarted(name: TEventName, callback: () => void | Promise<void>) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
      const unsubscribeListener = listener.startListening({
        actionCreator: schedulingActions.started,
        effect: (action) => {
          if (action.payload.name === name) {
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
          if (action.payload.name === name) {
            callbackRef.current();
          }
        },
      });
      return () => unsubscribeListener({ cancelActive: true });
    }, [name]);
  }

  return { useEventStarted, useEventSucceeded };
}
