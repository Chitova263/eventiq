import { createSlice, createAction, createListenerMiddleware } from '@reduxjs/toolkit';
import type { EventiqEngine, ExecutionPlan, ExecutionOutcome, EventiqState } from '@eventiq/core';

export function createEventiqRedux<TPlanName extends string, TStepName extends string>(
  engine: EventiqEngine<TPlanName, TStepName>,
) {
  const actions = {
    planSubmitted: createAction<ExecutionPlan<TPlanName, TStepName>>('eventiq/planSubmitted'),
    completed: createAction<{ name: TStepName; outcome: ExecutionOutcome }>('eventiq/completed'),
    stateSync: createAction<EventiqState<TPlanName, TStepName>>('eventiq/stateSync'),
  };

  const slice = createSlice({
    name: 'eventiq',
    initialState: engine.getState(),
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(actions.stateSync, (_, action) => action.payload);
    },
  });

  const listener = createListenerMiddleware();

  // Bridge Redux actions → engine commands
  listener.startListening({
    actionCreator: actions.planSubmitted,
    effect: (action) => {
      engine.submit(action.payload);
    },
  });

  listener.startListening({
    actionCreator: actions.completed,
    effect: (action) => {
      engine.complete(action.payload.name, action.payload.outcome);
    },
  });

  // Auto-start ready steps
  engine.onStepsReady((names) => {
    for (const name of names) engine.start(name);
  });

  return {
    actions,
    reducer: slice.reducer,
    listener,
    syncToStore(dispatch: (action: unknown) => void): () => void {
      return engine.subscribe(() => {
        dispatch(actions.stateSync(engine.getState()));
      });
    },
  };
}
