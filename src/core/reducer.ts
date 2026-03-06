import { EventiqStoreUtils } from '../utils/eventiqUtils.ts';
import type { EventiqActions, EventiqEventSchedularActions, EventiqStoreState } from '../types/planEvent.ts';
import { UnknownAction } from '@reduxjs/toolkit';

export function createEventiqReducer<TPlanName extends string, TEventName extends string>(
  eventiqActions: EventiqActions<TPlanName, TEventName>,
  eventiqEventSchedularActions: EventiqEventSchedularActions<TEventName>,
) {
  const initialState: EventiqStoreState<TPlanName, TEventName> = { queue: [], isQueueHandlingException: false };

  return (
    state: EventiqStoreState<TPlanName, TEventName> = initialState,
    action: UnknownAction,
  ): EventiqStoreState<TPlanName, TEventName> => {
    if (eventiqActions.planSubmitted.match(action)) {
      const newExecutablePlan = EventiqStoreUtils.getExecutablePlan(action.payload);
      const updatedQueue = [...state.queue, newExecutablePlan];
      return { ...state, queue: updatedQueue };
    }

    if (eventiqEventSchedularActions.started.match(action)) {
      if (!EventiqStoreUtils.getExecutableEvent(state.queue, action.payload.name)) {
        throw new Error(`Unexpected Error Event (${action.payload.name}) does not exist`);
      }
      return {
        ...state,
        queue: EventiqStoreUtils.updateExecutableEventStatus(state.queue, action.payload.name, 'RUNNING'),
      };
    }

    if (eventiqActions.eventSucceeded.match(action) || eventiqActions.eventSkipped.match(action)) {
      if (!EventiqStoreUtils.getExecutableEvent(state.queue, action.payload.name)) {
        throw new Error(`Unexpected Error Event (${action.payload.name}) does not exist`);
      }
      const updated = EventiqStoreUtils.completeExecutableEvent(state.queue, action.payload.name, 'SUCCESS');
      return { ...state, queue: EventiqStoreUtils.unblockCompletedEventDependants(updated, action.payload.name) };
    }

    if (eventiqActions.eventFailed.match(action)) {
      if (!EventiqStoreUtils.getExecutableEvent(state.queue, action.payload.name)) {
        throw new Error(`Unexpected Error Event (${action.payload.name}) does not exist`);
      }
      return {
        ...state,
        queue: EventiqStoreUtils.completeExecutableEvent(state.queue, action.payload.name, 'FAILURE'),
      };
    }

    return state;
  };
}
