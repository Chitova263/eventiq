import { createAction } from '@reduxjs/toolkit';
import type {
  ExecutionPlan,
  EventiqActions,
  EventiqEventSchedularActions,
  ExecutionOutcome,
} from '../types/planEvent.ts';

export function createEventiqActions<TPlanName extends string, TEventName extends string>(): EventiqActions<
  TPlanName,
  TEventName
> {
  return {
    planSubmitted: createAction<ExecutionPlan<TPlanName, TEventName>>('[eventiq/plan submitted]'),
    completed: createAction<{ name: TEventName; outcome: ExecutionOutcome }>('[eventiq/event completed]'),
  };
}

export function createEventiqSchedularActions<TEventName extends string>(): EventiqEventSchedularActions<TEventName> {
  return {
    started: createAction<{ name: TEventName }>('[eventiq/scheduling/started]'),
    succeeded: createAction<{ name: TEventName }>('[eventiq/scheduling/succeeded]'),
    failed: createAction<{ name: TEventName }>('[eventiq/scheduling/failed]'),
    skipped: createAction<{ name: TEventName }>('[eventiq/scheduling/skipped]'),
  };
}
