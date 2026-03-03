import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  eventConfigEnqueued,
  eventSucceeded,
  eventFailed,
  eventSkipped,
  executableStarted,
  executableSucceeded,
  executableFailed,
  executableSkipped,
} from './eventiqActions.ts';
import type { EventiqState } from './eventiqStore.ts';
import { logger } from './utils/logger.ts';

export const eventiqListener = createListenerMiddleware();

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
      listenerApi.dispatch(executableStarted({ event: event.name }));
    }
  }
}

eventiqListener.startListening({
  actionCreator: eventConfigEnqueued,
  effect: (action, listenerApi) => {
    logger.debug('Event config enqueued:', action.payload.name);
    startReadyEvents(listenerApi);
  },
});

eventiqListener.startListening({
  actionCreator: eventSucceeded,
  effect: (action) => {
    logger.debug('Event succeeded:', action.payload.event);
  },
});

eventiqListener.startListening({
  actionCreator: eventFailed,
  effect: (action) => {
    logger.debug('Event failed:', action.payload.event);
  },
});

eventiqListener.startListening({
  actionCreator: eventSkipped,
  effect: (action) => {
    logger.debug('Event skipped:', action.payload.event);
  },
});

eventiqListener.startListening({
  actionCreator: executableStarted,
  effect: (action) => {
    logger.debug('Executable started:', action.payload.event);
  },
});

eventiqListener.startListening({
  actionCreator: executableSucceeded,
  effect: (action, listenerApi) => {
    logger.debug('Executable succeeded:', action.payload.event);
    startReadyEvents(listenerApi);
  },
});

eventiqListener.startListening({
  actionCreator: executableFailed,
  effect: (action) => {
    logger.debug('Executable failed:', action.payload.event);
  },
});

eventiqListener.startListening({
  actionCreator: executableSkipped,
  effect: (action) => {
    logger.debug('Executable skipped:', action.payload.event);
  },
});
