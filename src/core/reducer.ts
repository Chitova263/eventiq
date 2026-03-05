import { EventiqStoreUtils } from '../utils/eventiqUtils.ts';
import type { EventiqActions, EventiqEventSchedularActions, EventiqStoreState } from '../types/planEvent.ts';
import { logger } from '../utils/logger.ts';

export function createEventiqReducer<TPlanName extends string, TEventName extends string>(
  eventiqActions: EventiqActions<TPlanName, TEventName>,
  eventiqEventSchedularActions: EventiqEventSchedularActions<TEventName>,
) {
  const initialState: EventiqStoreState<TPlanName, TEventName> = { queue: [], isQueueHandlingException: false };

  return (
    state: EventiqStoreState<TPlanName, TEventName> = initialState,
    action: { type: string; payload?: unknown },
  ): EventiqStoreState<TPlanName, TEventName> => {
    if (eventiqActions.planSubmitted.match(action)) {
      logger.debug(`[scheduling][reducer][action]${action.type}`);
      const newExecutablePlan = EventiqStoreUtils.mapExecutionPlanExecutablePlan(action.payload);
      return { ...state, queue: [...state.queue, newExecutablePlan] };
    }

    if (eventiqEventSchedularActions.started.match(action)) {
      logger.debug(`[scheduling][reducer][action]${action.type}`);
      const found = EventiqStoreUtils.findExecutableEventByName(state.queue, action.payload.name);
      if (!found) return { ...state, isQueueHandlingException: true };
      return {
        ...state,
        queue: state.queue.map((plan) => ({
          ...plan,
          events: plan.events.map((event) => {
            if (event.name !== action.payload.name) return event;
            return { ...event, status: 'RUNNING' as const, startTime: Date.now() };
          }),
        })),
      };
    }

    if (eventiqActions.eventSucceeded.match(action)) {
      logger.debug(`[scheduling][reducer][action]${action.type}`);
      const found = EventiqStoreUtils.findExecutableEventByName(state.queue, action.payload.name);
      if (!found) return { ...state, isQueueHandlingException: true };
      const updated = state.queue.map((plan) => ({
        ...plan,
        events: plan.events.map((event) => {
          if (event.name !== action.payload.name) return event;
          return { ...event, status: 'COMPLETE' as const, outcome: 'SUCCESS' as const, endTime: Date.now() };
        }),
      }));
      return { ...state, queue: EventiqStoreUtils.unblockDependants(updated, action.payload.name) };
    }

    if (eventiqActions.eventFailed.match(action)) {
      logger.debug(`[scheduling][reducer][action]${action.type}`);
      const found = EventiqStoreUtils.findExecutableEventByName(state.queue, action.payload.name);
      if (!found) return { ...state, isQueueHandlingException: true };
      return {
        ...state,
        queue: state.queue.map((plan) => ({
          ...plan,
          events: plan.events.map((event) => {
            if (event.name !== action.payload.name) return event;
            return { ...event, status: 'COMPLETE' as const, outcome: 'FAILURE' as const, endTime: Date.now() };
          }),
        })),
      };
    }

    if (eventiqActions.eventSkipped.match(action)) {
      logger.debug(`[scheduling][reducer][action]${action.type}`);
      const found = EventiqStoreUtils.findExecutableEventByName(state.queue, action.payload.name);
      if (!found) return { ...state, isQueueHandlingException: true };
      const updated = state.queue.map((plan) => ({
        ...plan,
        events: plan.events.map((event) => {
          if (event.name !== action.payload.name) return event;
          return { ...event, status: 'COMPLETE' as const, outcome: 'SKIPPED' as const, endTime: Date.now() };
        }),
      }));
      return { ...state, queue: EventiqStoreUtils.unblockDependants(updated, action.payload.name) };
    }

    return state;
  };
}
