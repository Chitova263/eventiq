import { logger } from '../utils/logger.ts';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { SchedulerUtil } from '../utils/schedularUtil.ts';
import { StoreUtil } from '../utils/storeUtil.ts';
import { EventiqActions, EventiqEventSchedularActions, EventiqStore } from '../types/planEvent.ts';

export function createEventiqListenerMiddleware<TExecutableConfigurationName extends string, TEventName extends string>(
  eventiqPublicActions: EventiqActions<TExecutableConfigurationName, TEventName>,
  eventiqSchedulingActions: EventiqEventSchedularActions<TEventName>,
) {
  const listener = createListenerMiddleware<EventiqStore>();

  listener.startListening({
    matcher: isAnyOf(
      eventiqPublicActions.planSubmitted,
      eventiqSchedulingActions.succeeded,
      eventiqPublicActions.eventSucceeded,
      eventiqPublicActions.eventSkipped,
    ),
    effect: (action, listenerApi) => {
      logger.debug(`[scheduling][listener][action]${action.type}`);

      const state = listenerApi.getState();
      const readyEvents = StoreUtil.getReadyEvents(state.eventiq.queue);

      if (readyEvents.length > 0) {
        logger.debug(`[scheduling][starting events][${readyEvents.map((evt) => evt.name).join(', ')}]`);
        SchedulerUtil.startReadyEvents(readyEvents, listenerApi.dispatch, eventiqSchedulingActions);
      }
    },
  });

  listener.startListening({
    actionCreator: eventiqPublicActions.eventSkipped,
    effect: (action) => {
      logger.debug(`[${action.payload.name}] Event skipped`);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.started,
    effect: (action) => {
      logger.debug(`[scheduling][${action.payload.name}] Event started`);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.failed,
    effect: (action) => {
      logger.debug(`[scheduling][${action.payload.name}] Event failed`);
    },
  });

  listener.startListening({
    actionCreator: eventiqSchedulingActions.skipped,
    effect: (action) => {
      logger.debug(`[scheduling][${action.payload.name}] Event skipped`);
    },
  });

  return listener;
}
