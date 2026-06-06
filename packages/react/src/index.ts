import { useSyncExternalStore, useEffect, useRef, useCallback } from 'react';
import type { EventiqEngine, EventiqState, ExecutionOutcome } from '@eventiq/core';

export function useEventiqState<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
): EventiqState<TPlanName, TStepName> {
  return useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getState(),
  );
}

export function useStepStarted<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
  name: TStepName,
  callback: () => void,
): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    return engine.onStepStarted(name, () => ref.current());
  }, [engine, name]);
}

export function useStepCompleted<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
  name: TStepName,
  callback: (outcome: ExecutionOutcome) => void,
): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    return engine.onStepCompleted(name, (outcome) => ref.current(outcome));
  }, [engine, name]);
}

export function useStepsReady<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
  callback: (names: TStepName[]) => void,
): void {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    return engine.onStepsReady((names) => ref.current(names));
  }, [engine]);
}

export function useAutoSchedule<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
): void {
  useEffect(() => {
    return engine.onStepsReady((names) => {
      for (const name of names) engine.start(name);
    });
  }, [engine]);
}
