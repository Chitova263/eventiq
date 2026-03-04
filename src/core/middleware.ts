import { logger } from '../utils/logger.ts';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { SchedulerUtil } from '../utils/schedularUtil.ts';
import { StoreUtil } from '../utils/storeUtil.ts';
import { EventiqActions, EventiqSchedulingActions, EventiqStore } from '../types/event.ts';

export function createEventiqListenerMiddleware<TExecutableConfigurationName extends string, TEventName extends string>(
  eventiqPublicActions: EventiqActions<TExecutableConfigurationName, TEventName>,
  eventiqSchedulingActions: EventiqSchedulingActions<TEventName>,
) {
  const listener = createListenerMiddleware<EventiqStore>();

  listener.startListening({
    matcher: isAnyOf(eventiqPublicActions.enqueued, eventiqSchedulingActions.succeeded, eventiqPublicActions.succeeded),
    effect: (_, listenerApi) => {
      const state = listenerApi.getState();
      const readyEvents = StoreUtil.getReadyEvents(state.eventiq.queue);

      if (readyEvents.length > 0) {
        logger.debug(`[scheduling][starting events][${readyEvents.map((evt) => evt.name).join(', ')}]`);
        SchedulerUtil.startReadyEvents(readyEvents, listenerApi.dispatch, eventiqSchedulingActions);
      }
    },
  });

  listener.startListening({
    actionCreator: eventiqPublicActions.skipped,
    effect: (action) => {
      logger.debug(`[${action.payload.event}] Event skipped`);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.started,
    effect: (action) => {
      logger.debug(`[scheduling][${action.payload.event}] Event succeeded`);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.failed,
    effect: (action) => {
      logger.debug(`[scheduling][${action.payload.event}] Event failed`);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.skipped,
    effect: (action) => {
      logger.debug(`[scheduling][${action.payload.event}] Event skipped`);
    },
  });

  return listener;
}
