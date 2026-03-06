import { logger } from '../utils/logger.ts';
import { createListenerMiddleware, isAnyOf, UnknownAction } from '@reduxjs/toolkit';
import { SchedulerUtil } from '../utils/schedularUtil.ts';
import { StoreUtil } from '../utils/storeUtil.ts';
import type { EventiqActions, EventiqEventSchedularActions, EventiqStore } from '../types/planEvent.ts';

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
    effect: (_, listenerApi) => {
      const state = listenerApi.getState();
      const readyEvents = StoreUtil.getReadyEvents(state.eventiq.queue);

      if (readyEvents.length > 0) {
        logger.debug(`[scheduling][starting events concurrently][${readyEvents.map((evt) => evt.name).join(', ')}]`);
        SchedulerUtil.startReadyEvents(readyEvents, listenerApi.dispatch, eventiqSchedulingActions);
      }
    },
  });

  // Logging Listener
  listener.startListening({
    matcher: isAnyOf(
      eventiqSchedulingActions.succeeded,
      eventiqSchedulingActions.failed,
      eventiqSchedulingActions.skipped,
      eventiqSchedulingActions.started,
    ),
    effect: (action: UnknownAction) => {
      logger.debug(`[listener]${action.type} ${(action as any)['payload']['name']}`);
    },
  });

  return listener;
}
