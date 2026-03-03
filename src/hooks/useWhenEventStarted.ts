import { useEffect, useRef } from 'react';
import { executableStarted } from '../eventiqActions.ts';
import { eventiqListener } from '../eventiqListener.ts';

export function useWhenEventStarted<TEvent>(
  name: TEvent,
  callback: () => void | Promise<void>,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribeListener = eventiqListener.startListening({
      actionCreator: executableStarted,
      effect: (action) => {
        if (action.payload.event === name) {
          callbackRef.current();
        }
      },
    });

    // When the component unmounts, you always want to cancel any in-flight effect. A component that's gone shouldn't keep running side effects.
    return () => unsubscribeListener({ cancelActive: true });
  }, [name]);
}
