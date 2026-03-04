import { ActionCreatorWithPayload, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

export type Event<TEventName extends string> = {
  name: TEventName;
  needs: TEventName[];
};

export type EventConfig<
  TExecutableConfigurationName extends string,
  TEventName extends string,
  TEvent = Event<TEventName>,
> = {
  name: TExecutableConfigurationName;
  events: TEvent[];
};

export type ExecutableEventStatus = 'IDLE' | 'BLOCKED' | 'READY' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'SKIPPED';

export type ExecutableEventOutcome = 'SUCCESS' | 'FAILURE' | 'SKIPPED';

export type ExecutableEvent<TEventName extends string> = {
  id: string;
  name: TEventName;
  status: ExecutableEventStatus;
  needs: ExecutableEvent<TEventName>[];
  dependants: Pick<ExecutableEvent<TEventName>, 'id' | 'name'>[];
  outcome: ExecutableEventOutcome | null;
  startTime: number | null;
  endTime: number | null;
};

export type EventiqDispatch = ThunkDispatch<EventiqStore, unknown, UnknownAction>;

export interface EventiqActions<TExecutableConfigurationName extends string, TEventName extends string = string> {
  enqueued: ActionCreatorWithPayload<EventConfig<TExecutableConfigurationName, TEventName>>;
  succeeded: ActionCreatorWithPayload<{ event: TEventName }>;
  failed: ActionCreatorWithPayload<{ event: TEventName }>;
  skipped: ActionCreatorWithPayload<{ event: TEventName }>;
}

export interface EventiqSchedulingActions<TEventName extends string> {
  started: ActionCreatorWithPayload<{ event: TEventName }>;
  succeeded: ActionCreatorWithPayload<{ event: TEventName }>;
  failed: ActionCreatorWithPayload<{ event: TEventName }>;
  skipped: ActionCreatorWithPayload<{ event: TEventName }>;
}

export type EventiqState = {
  queue: EventConfig<string, string, ExecutableEvent<string>>[];
};

export type EventiqStore = {
  eventiq: EventiqState;
};
