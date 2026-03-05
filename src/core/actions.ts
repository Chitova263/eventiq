import { createAction } from '@reduxjs/toolkit';
import type { ExecutionPlan, EventiqActions, EventiqEventSchedularActions } from '../types/planEvent.ts';

export function createEventiqActions<
  TExecutableConfigurationName extends string,
  TEventName extends string,
>(): EventiqActions<TExecutableConfigurationName, TEventName> {
  return {
    planSubmitted: createAction<ExecutionPlan<TExecutableConfigurationName, TEventName>>(
      '[eventiq] execution plan submitted',
    ),
    eventSucceeded: createAction<{ name: TEventName }>('[eventiq] event succeeded'),
    eventFailed: createAction<{ name: TEventName }>('[eventiq] event failed'),
    eventSkipped: createAction<{ name: TEventName }>('[eventiq] event skipped'),
  };
}

export function createEventiqSchedularActions<TEventName extends string>(): EventiqEventSchedularActions<TEventName> {
  return {
    started: createAction<{ name: TEventName }>('[eventiq][scheduling] execution started'),
    succeeded: createAction<{ name: TEventName }>('[eventiq][scheduling] execution succeeded'),
    failed: createAction<{ name: TEventName }>('[eventiq][scheduling] execution failed'),
    skipped: createAction<{ name: TEventName }>('[eventiq][scheduling] execution skipped'),
  };
}
