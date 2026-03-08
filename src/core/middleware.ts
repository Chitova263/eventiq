import { logger } from '../utils/logger.ts';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import type { EventiqActions, EventiqEventSchedularActions, EventiqStore } from '../types/planEvent.ts';
import { EventiqSelectors } from './selector.ts';

export function createEventiqListenerMiddleware<TPlanName extends string, TEventName extends string>(
  eventiqPublicActions: EventiqActions<TPlanName, TEventName>,
  eventiqSchedulingActions: EventiqEventSchedularActions<TEventName>,
  eventiqSelectors: EventiqSelectors<TPlanName, TEventName>,
) {
  const listener = createListenerMiddleware<EventiqStore<TPlanName, TEventName>>();

  listener.startListening({
    matcher: isAnyOf(
      eventiqPublicActions.planSubmitted,
      eventiqPublicActions.completed,
      eventiqSchedulingActions.succeeded,
    ),
    effect: (_, listenerApi) => {
      for (const event of eventiqSelectors.selectReadyEvents(listenerApi.getState())) {
        listenerApi.dispatch(eventiqSchedulingActions.started({ name: event.name }));
      }
    },
  });

  // Logging Listener
  listener.startListening({
    matcher: isAnyOf(
      eventiqSchedulingActions.started,
      eventiqSchedulingActions.succeeded,
      eventiqSchedulingActions.failed,
      eventiqSchedulingActions.skipped,
      eventiqPublicActions.planSubmitted,
      eventiqPublicActions.completed,
    ),
    effect: (action) => {
      logger.debug(`[listener] ${action.type}`);
    },
  });

  return listener;
}
