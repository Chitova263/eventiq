import { createSelector } from '@reduxjs/toolkit';
import { EventiqStore, EventiqStoreState } from '../types/planEvent.ts';
import { EventiqStoreUtils } from '../utils/eventiqUtils.ts';

export function createEventiqSelectors<TPlanName extends string, TEventName extends string>(
  selectEventiq: (rootState: EventiqStore<TPlanName, TEventName>) => EventiqStoreState<TPlanName, TEventName>,
) {
  const selectQueue = (state: EventiqStore<TPlanName, TEventName>) => selectEventiq(state).queue;

  const selectReadyEvents = createSelector(selectQueue, (queue) => EventiqStoreUtils.getReadyEvents(queue));

  const selectIsQueueHandlingException = (state: EventiqStore<TPlanName, TEventName>) =>
    selectEventiq(state).isQueueHandlingException;

  const selectEventByName = (state: EventiqStore<TPlanName, TEventName>, name: TEventName) =>
    EventiqStoreUtils.throwIfEventNotExist(selectQueue(state), name);

  return {
    selectQueue,
    selectReadyEvents,
    selectIsQueueHandlingException,
    selectEventByName,
  };
}

export type EventiqSelectors<TPlanName extends string, TEventName extends string> = ReturnType<
  typeof createEventiqSelectors<TPlanName, TEventName>
>;
