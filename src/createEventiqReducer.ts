import { EventiqActions, EventiqSchedulingActions } from './eventiqActions.ts';
import { createReducer } from '@reduxjs/toolkit';
import {
  skipDependants,
  transformToExecutableEvents,
  unblockDependants,
  updateEvent,
} from './utils/eventiqUtils.ts';
import { EventiqState } from './eventiqStore.ts';

const initialState: EventiqState = {
  queue: [],
};

export function createEventiqReducer<
  TExecutableConfigurationName extends string,
  TEventName extends string,
>(
  actions: EventiqActions<TExecutableConfigurationName, TEventName>,
  eventiqSchedulingActions: EventiqSchedulingActions<TEventName>,
) {
  return createReducer(initialState, (builder) => {
    builder
      .addCase(actions.eventConfigEnqueued, (_state, action) => {
        return {
          queue: transformToExecutableEvents(action.payload.events),
        };
      })
      .addCase(eventiqSchedulingActions.executableStarted, (state, action) => {
        return {
          queue: updateEvent(state.queue, action.payload.event, {
            status: 'RUNNING',
            startTime: Date.now(),
          }),
        };
      })
      .addCase(actions.eventSucceeded, (state, action) => {
        const queue = updateEvent(state.queue, action.payload.event, {
          status: 'COMPLETE',
          outcome: 'SUCCESS',
          endTime: Date.now(),
        });
        return { queue: unblockDependants(queue) };
      })
      .addCase(eventiqSchedulingActions.executableFailed, (state, action) => {
        const queue = updateEvent(state.queue, action.payload.event, {
          status: 'FAILED',
          outcome: 'FAILURE',
          endTime: Date.now(),
        });
        return { queue: skipDependants(queue, action.payload.event) };
      })
      .addCase(eventiqSchedulingActions.executableSkipped, (state, action) => {
        const queue = updateEvent(state.queue, action.payload.event, {
          status: 'SKIPPED',
          outcome: 'SKIPPED',
          endTime: Date.now(),
        });
        return { queue: skipDependants(queue, action.payload.event) };
      });
  });
}

export type EventiqReducer = ReturnType<typeof createEventiqReducer>;
