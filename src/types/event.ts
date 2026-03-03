export type Event<TEventName extends string> = {
  name: TEventName;
  needs: TEventName[];
};

export type EventConfig<
  TExecutableConfigurationName extends string,
  TEventName extends string,
> = {
  name: TExecutableConfigurationName;
  events: Event<TEventName>[];
};

export type ExecutableEventStatus =
  | 'IDLE'
  | 'BLOCKED'
  | 'READY'
  | 'RUNNING'
  | 'COMPLETE'
  | 'FAILED'
  | 'SKIPPED';

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
