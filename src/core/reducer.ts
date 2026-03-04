import { createReducer } from '@reduxjs/toolkit';
import { skipDependants, transformToExecutableEvents, unblockDependants, updateEvent } from '../utils/eventiqUtils.ts';
import { EventiqActions, EventiqSchedulingActions, EventiqState } from '../types/event.ts';

const initialState: EventiqState = {
  queue: [],
};

export function createEventiqReducer<TExecutableConfigurationName extends string, TEventName extends string>(
  actions: EventiqActions<TExecutableConfigurationName, TEventName>,
  eventiqSchedulingActions: EventiqSchedulingActions<TEventName>,
) {
  return createReducer(initialState, (builder) => {
    builder
      .addCase(actions.enqueued, (state, action) => {
        return {
          ...state,
          queue: [
            ...state.queue,
            {
              name: action.payload.name,
              events: transformToExecutableEvents(action.payload.events),
            },
          ],
        };
      })
      .addCase(eventiqSchedulingActions.started, (state, action) => {
        return {
          queue: state.queue.map((config) => ({
            ...config,
            events: updateEvent(config.events, action.payload.event, {
              status: 'RUNNING',
              startTime: Date.now(),
            }),
          })),
        };
      })
      .addCase(actions.succeeded, (state, action) => {
        return {
          queue: state.queue.map((config) => ({
            ...config,
            events: unblockDependants(
              updateEvent(config.events, action.payload.event, {
                status: 'COMPLETE',
                outcome: 'SUCCESS',
                endTime: Date.now(),
              }),
            ),
          })),
        };
      })
      .addCase(eventiqSchedulingActions.failed, (state, action) => {
        return {
          queue: state.queue.map((config) => ({
            ...config,
            events: skipDependants(
              updateEvent(config.events, action.payload.event, {
                status: 'FAILED',
                outcome: 'FAILURE',
                endTime: Date.now(),
              }),
              action.payload.event,
            ),
          })),
        };
      })
      .addCase(eventiqSchedulingActions.skipped, (state, action) => {
        return {
          queue: state.queue.map((config) => ({
            ...config,
            events: skipDependants(
              updateEvent(config.events, action.payload.event, {
                status: 'SKIPPED',
                outcome: 'SKIPPED',
                endTime: Date.now(),
              }),
              action.payload.event,
            ),
          })),
        };
      });
  });
}

export type EventiqReducer = ReturnType<typeof createEventiqReducer>;
