import { ActionCreatorWithPayload, createAction } from '@reduxjs/toolkit';
import { EventConfig } from './types/event.ts';

export interface EventiqActions<
  TExecutableConfigurationName extends string,
  TEventName extends string = string,
> {
  eventConfigEnqueued: ActionCreatorWithPayload<
    EventConfig<TExecutableConfigurationName, TEventName>
  >;
  eventSucceeded: ActionCreatorWithPayload<{ event: TEventName }>;
  eventFailed: ActionCreatorWithPayload<{ event: TEventName }>;
  eventSkipped: ActionCreatorWithPayload<{ event: TEventName }>;
}

export interface EventiqSchedulingActions<TEventName extends string = string> {
  executableStarted: ActionCreatorWithPayload<{ event: TEventName }>;
  executableSucceeded: ActionCreatorWithPayload<{ event: TEventName }>;
  executableFailed: ActionCreatorWithPayload<{ event: TEventName }>;
  executableSkipped: ActionCreatorWithPayload<{ event: TEventName }>;
}

export function createEventiqActions<
  TExecutableConfigurationName extends string,
  TEventName extends string,
>(): EventiqActions<TExecutableConfigurationName, TEventName> {
  return {
    eventConfigEnqueued: createAction<
      EventConfig<TExecutableConfigurationName, TEventName>
    >('[eventiq] event config enqueued'),
    eventSucceeded: createAction<{ event: TEventName }>(
      '[eventiq] event succeeded',
    ),
    eventFailed: createAction<{ event: TEventName }>('[eventiq] event failed'),
    eventSkipped: createAction<{ event: TEventName }>(
      '[eventiq] event skipped',
    ),
  };
}

export function createEventiqSchedulingActions<
  TEventName extends string,
>(): EventiqSchedulingActions<TEventName> {
  return {
    executableStarted: createAction<{ event: TEventName }>(
      '[eventiq/scheduling] executable started',
    ),
    executableSucceeded: createAction<{ event: TEventName }>(
      '[eventiq/scheduling] executable succeeded',
    ),
    executableFailed: createAction<{ event: TEventName }>(
      '[eventiq/scheduling] executable failed',
    ),
    executableSkipped: createAction<{ event: TEventName }>(
      '[eventiq/scheduling] executable skipped',
    ),
  };
}
