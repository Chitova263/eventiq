import { createAction } from '@reduxjs/toolkit';
import { EventConfig, EventiqActions, EventiqSchedulingActions } from '../types/event.ts';

export function createEventiqActions<
  TExecutableConfigurationName extends string,
  TEventName extends string,
>(): EventiqActions<TExecutableConfigurationName, TEventName> {
  return {
    enqueued: createAction<EventConfig<TExecutableConfigurationName, TEventName>>('[eventiq] event config enqueued'),
    succeeded: createAction<{ event: TEventName }>('[eventiq] event succeeded'),
    failed: createAction<{ event: TEventName }>('[eventiq] event failed'),
    skipped: createAction<{ event: TEventName }>('[eventiq] event skipped'),
  };
}

export function createEventiqSchedulingActions<TEventName extends string>(): EventiqSchedulingActions<TEventName> {
  return {
    started: createAction<{ event: TEventName }>('[eventiq/scheduling] executable started'),
    succeeded: createAction<{ event: TEventName }>('[eventiq/scheduling] executable succeeded'),
    failed: createAction<{ event: TEventName }>('[eventiq/scheduling] executable failed'),
    skipped: createAction<{ event: TEventName }>('[eventiq/scheduling] executable skipped'),
  };
}
