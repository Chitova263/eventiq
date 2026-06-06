export type Step<TStepName extends string> = {
  name: TStepName;
  needs: TStepName[];
};

export type ExecutionPlan<TPlanName extends string, TStepName extends string> = {
  name: TPlanName;
  steps: Step<TStepName>[];
};

export type ExecutionStatus = 'IDLE' | 'BLOCKED' | 'READY' | 'RUNNING' | 'COMPLETE';

export type ExecutionOutcome = 'SUCCESS' | 'FAILURE' | 'SKIPPED';

export type ExecutableStep<TStepName extends string> = {
  id: string;
  name: TStepName;
  status: ExecutionStatus;
  outcome: ExecutionOutcome | null;
  needs: TStepName[];
  dependants: TStepName[];
  startTime: number | null;
  endTime: number | null;
};

export type ExecutablePlan<TPlanName extends string, TStepName extends string> = {
  name: TPlanName;
  steps: ExecutableStep<TStepName>[];
};

export type EventiqState<TPlanName extends string, TStepName extends string> = {
  queue: ExecutablePlan<TPlanName, TStepName>[];
};
