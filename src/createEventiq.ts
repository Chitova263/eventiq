import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  createEventiqActions,
  createEventiqSchedulingActions,
  EventiqActions,
} from './eventiqActions.ts';
import type { EventiqState } from './eventiqStore.ts';
import { logger } from './utils/logger.ts';
import { useEffect, useRef } from 'react';
import { createEventiqReducer } from './createEventiqReducer.ts';

export function createEventiq<
  TExecutableConfigurationName extends string,
  TEventName extends string,
>() {
  const eventiqPublicActions: EventiqActions<
    TExecutableConfigurationName,
    TEventName
  > = createEventiqActions();

  const eventiqSchedulingActions = createEventiqSchedulingActions<TEventName>();

  const reducer = createEventiqReducer(
    eventiqPublicActions,
    eventiqSchedulingActions,
  );

  // Listener middleware
  const listener = createListenerMiddleware();

  function startReadyEvents(listenerApi: {
    getState: () => unknown;
    dispatch: (action: unknown) => void;
  }) {
    const state = listenerApi.getState() as { eventiq: EventiqState };
    const readyEvents = state.eventiq.queue.filter((e) => e.status === 'READY');
    if (readyEvents.length > 0) {
      logger.debug(
        'Starting ready events:',
        readyEvents.map((e) => e.name),
      );
      for (const event of readyEvents) {
        listenerApi.dispatch(
          eventiqSchedulingActions.executableStarted({
            event: event.name as TEventName,
          }),
        );
      }
    }
  }

  listener.startListening({
    actionCreator: eventiqPublicActions.eventConfigEnqueued,
    effect: (action, listenerApi) => {
      logger.debug('Event config enqueued:', action.payload.name);
      startReadyEvents(listenerApi);
    },
  });

  listener.startListening({
    actionCreator: eventiqPublicActions.eventSucceeded,
    effect: (action) => {
      logger.debug('Event succeeded:', action.payload.event);
    },
  });

  listener.startListening({
    actionCreator: eventiqPublicActions.eventFailed,
    effect: (action) => {
      logger.debug('Event failed:', action.payload.event);
    },
  });

  listener.startListening({
    actionCreator: eventiqPublicActions.eventSkipped,
    effect: (action) => {
      logger.debug('Event skipped:', action.payload.event);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.executableStarted,
    effect: (action) => {
      logger.debug('Executable started:', action.payload.event);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.executableSucceeded,
    effect: (action, listenerApi) => {
      logger.debug('Executable succeeded:', action.payload.event);
      startReadyEvents(listenerApi);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.executableFailed,
    effect: (action) => {
      logger.debug('Executable failed:', action.payload.event);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.executableSkipped,
    effect: (action) => {
      logger.debug('Executable skipped:', action.payload.event);
    },
  });

  return {
    actions: eventiqPublicActions,
    reducer,
    listener,
    hooks: {
      useWhenEventStarted: function useWhenEventStarted(
        name: TEventName,
        callback: () => void | Promise<void>,
      ) {
        const callbackRef = useRef(callback);
        callbackRef.current = callback;

        useEffect(() => {
          const unsubscribeListener = listener.startListening({
            actionCreator: eventiqSchedulingActions.executableStarted,
            effect: (action) => {
              if (action.payload.event === name) {
                callbackRef.current();
              }
            },
          });
          return () => unsubscribeListener({ cancelActive: true });
        }, [listener, eventiqPublicActions, name]);
      },
    },
  };
}

export type EventiqType<
  TExecutableConfigurationName extends string,
  TEventName extends string,
> = ReturnType<typeof createEventiq<TExecutableConfigurationName, TEventName>>;
