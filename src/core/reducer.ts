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
      const newExecutablePlan = EventiqStoreUtils.generateExecutablePlan(action.payload);
      return { ...state, queue: [...state.queue, newExecutablePlan] };
    }

    if (eventiqEventSchedularActions.started.match(action)) {
      const { name } = action.payload;
      EventiqStoreUtils.throwIfEventNotExist(state.queue, name);
      return {
        ...state,
        queue: EventiqStoreUtils.updateExecutableEventStatus(state.queue, name, 'RUNNING'),
      };
    }

    if (eventiqActions.completed.match(action)) {
      const { name, outcome } = action.payload;
      EventiqStoreUtils.throwIfEventNotExist(state.queue, name);
      if (outcome === 'FAILURE') {
        return {
          ...state,
          queue: EventiqStoreUtils.completeExecutableEvent(state.queue, name, outcome),
        };
      }
      const updated = EventiqStoreUtils.completeExecutableEvent(state.queue, name, outcome);
      return { ...state, queue: EventiqStoreUtils.unblockCompletedEventDependants(updated, name) };
    }

    return state;
  };
}
