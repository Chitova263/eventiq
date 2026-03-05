import type { ActionCreatorWithPayload, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

export type PlanEvent<TEventName extends string> = {
  name: TEventName;
  needs: TEventName[];
};

export type ExecutionPlan<TPlanName extends string, TEventName extends string> = {
  name: TPlanName;
  events: PlanEvent<TEventName>[];
};

export type ExecutionStatus = 'IDLE' | 'BLOCKED' | 'READY' | 'RUNNING' | 'COMPLETE';

export type ExecutionOutcome = 'SUCCESS' | 'FAILURE' | 'SKIPPED';

export type ExecutableEventDependant<TEventName extends string> = Pick<ExecutableEvent<TEventName>, 'id' | 'name'>;

export type ExecutableEvent<TEventName extends string> = {
  id: string;
  name: TEventName;
  status: ExecutionStatus;
  needs: ExecutableEvent<TEventName>[];
  dependants: ExecutableEventDependant<TEventName>[];
  outcome: ExecutionOutcome | null;
  startTime: number | null;
  endTime: number | null;
};

export type ExecutablePlan<TPlanName extends string, TEventName extends string> = {
  name: TPlanName;
  events: ExecutableEvent<TEventName>[];
};

export type EventiqStoreState<TPlanName extends string = string, TEventName extends string = string> = {
  queue: ExecutablePlan<TPlanName, TEventName>[];
  isQueueHandlingException: boolean;
};

export interface EventiqActions<TPlanName extends string, TEventName extends string = string> {
  planSubmitted: ActionCreatorWithPayload<ExecutionPlan<TPlanName, TEventName>>;
  eventSucceeded: ActionCreatorWithPayload<{ name: TEventName }>;
  eventFailed: ActionCreatorWithPayload<{ name: TEventName }>;
  eventSkipped: ActionCreatorWithPayload<{ name: TEventName }>;
}

export interface EventiqEventSchedularActions<TEventName extends string> {
  started: ActionCreatorWithPayload<{ name: TEventName }>;
  succeeded: ActionCreatorWithPayload<{ name: TEventName }>;
  failed: ActionCreatorWithPayload<{ name: TEventName }>;
  skipped: ActionCreatorWithPayload<{ name: TEventName }>;
}

export type EventiqStore = {
  eventiq: EventiqStoreState;
};

export type EventiqDispatch = ThunkDispatch<EventiqStore, unknown, UnknownAction>;
