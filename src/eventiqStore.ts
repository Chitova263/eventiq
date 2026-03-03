import { createReducer } from '@reduxjs/toolkit';
import { ExecutableEvent } from './types/event.ts';
import {
  eventConfigEnqueued,
  executableStarted,
  executableFailed,
  executableSkipped,
  eventSucceeded,
} from './eventiqActions.ts';
import { transformToExecutableEvents } from './utils/transformToExecutableEvents.ts';

export type EventiqState = {
  queue: ExecutableEvent<string>[];
};

const initialState: EventiqState = {
  queue: [],
};

function updateEvent(
  queue: ExecutableEvent<string>[],
  name: string,
  updates: Partial<ExecutableEvent<string>>,
): ExecutableEvent<string>[] {
  return queue.map((event) =>
    event.name === name ? { ...event, ...updates } : event,
  );
}

function unblockDependants(
  queue: ExecutableEvent<string>[],
): ExecutableEvent<string>[] {
  return queue.map((event) => {
    if (event.status !== 'BLOCKED') return event;
    const allNeedsMet = event.needs.every((need) => {
      const actual = queue.find((e) => e.name === need.name);
      return (
        actual && (actual.status === 'COMPLETE' || actual.status === 'SKIPPED')
      );
    });
    return allNeedsMet ? { ...event, status: 'READY' as const } : event;
  });
}

function skipDependants(
  queue: ExecutableEvent<string>[],
  failedName: string,
): ExecutableEvent<string>[] {
  let updated = queue.map((event) => {
    if (event.status !== 'BLOCKED') return event;
    const dependsOnFailed = event.needs.some(
      (need) => need.name === failedName,
    );
    if (!dependsOnFailed) return event;
    return {
      ...event,
      status: 'SKIPPED' as const,
      outcome: 'SKIPPED' as const,
      endTime: Date.now(),
    };
  });

  const newlySkipped = updated.filter(
    (e, i) => e.status === 'SKIPPED' && queue[i].status !== 'SKIPPED',
  );
  for (const skipped of newlySkipped) {
    updated = skipDependants(updated, skipped.name);
  }

  return updated;
}

export const eventiqReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(eventConfigEnqueued, (_state, action) => {
      return {
        queue: transformToExecutableEvents(action.payload.events),
      };
    })
    .addCase(executableStarted, (state, action) => {
      return {
        queue: updateEvent(state.queue, action.payload.event, {
          status: 'RUNNING',
          startTime: Date.now(),
        }),
      };
    })
    .addCase(eventSucceeded, (state, action) => {
      const queue = updateEvent(state.queue, action.payload.event, {
        status: 'COMPLETE',
        outcome: 'SUCCESS',
        endTime: Date.now(),
      });
      return {
        queue: unblockDependants(queue),
      };
    })
    .addCase(executableFailed, (state, action) => {
      const queue = updateEvent(state.queue, action.payload.event, {
        status: 'FAILED',
        outcome: 'FAILURE',
        endTime: Date.now(),
      });
      return { queue: skipDependants(queue, action.payload.event) };
    })
    .addCase(executableSkipped, (state, action) => {
      const queue = updateEvent(state.queue, action.payload.event, {
        status: 'SKIPPED',
        outcome: 'SKIPPED',
        endTime: Date.now(),
      });
      return { queue: skipDependants(queue, action.payload.event) };
    });
});
