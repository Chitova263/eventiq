import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey, QueryFunction } from '@tanstack/react-query';
import type { EventiqEngine, ExecutionOutcome } from '@eventiq/core';

export type StepQueryConfig<TStepName extends string> = {
  name: TStepName;
  queryKey: QueryKey;
  queryFn: QueryFunction;
  onError?: 'fail' | 'skip';
};

/**
 * Binds engine steps to React Query fetches.
 * When a step starts, its associated query is fetched via queryClient.
 * On success → engine.complete(name, 'SUCCESS').
 * On error → engine.complete(name, 'FAILURE') or 'SKIPPED' based on config.
 */
export function useEventiqQueries<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
  steps: StepQueryConfig<TStepName>[],
): void {
  const queryClient = useQueryClient();
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    const unsubscribes = stepsRef.current.map((step) =>
      engine.onStepStarted(step.name, () => {
        const config = stepsRef.current.find((s) => s.name === step.name)!;
        queryClient
          .fetchQuery({ queryKey: config.queryKey, queryFn: config.queryFn })
          .then(() => engine.complete(step.name, 'SUCCESS'))
          .catch(() => {
            const outcome: ExecutionOutcome = config.onError === 'skip' ? 'SKIPPED' : 'FAILURE';
            engine.complete(step.name, outcome);
          });
      }),
    );
    return () => { for (const unsub of unsubscribes) unsub(); };
  }, [engine, queryClient]);
}

/**
 * Imperative helper for non-hook contexts.
 * Wires an engine instance to a queryClient — auto-starts and auto-completes steps.
 */
export function bindEventiqToQueryClient<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
  queryClient: QueryClient,
  steps: StepQueryConfig<TStepName>[],
): () => void {
  const unsubReady = engine.onStepsReady((names) => {
    for (const name of names) engine.start(name);
  });

  const unsubSteps = steps.map((step) =>
    engine.onStepStarted(step.name, () => {
      queryClient
        .fetchQuery({ queryKey: step.queryKey, queryFn: step.queryFn })
        .then(() => engine.complete(step.name, 'SUCCESS'))
        .catch(() => {
          const outcome: ExecutionOutcome = step.onError === 'skip' ? 'SKIPPED' : 'FAILURE';
          engine.complete(step.name, outcome);
        });
    }),
  );

  return () => {
    unsubReady();
    for (const unsub of unsubSteps) unsub();
  };
}
