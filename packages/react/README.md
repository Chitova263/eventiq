# @eventiq/react

React bindings for `@eventiq/core`. Hooks powered by `useSyncExternalStore`.

## Install

```bash
npm install @eventiq/core @eventiq/react
```

## Hooks

### `useEventiqState(engine)`

Subscribes to engine state changes. Re-renders on every transition.

```tsx
import { useEventiqState } from '@eventiq/react';

function PipelineStatus({ engine }) {
  const state = useEventiqState(engine);

  return (
    <ul>
      {state.queue[0]?.steps.map((step) => (
        <li key={step.id}>{step.name}: {step.status}</li>
      ))}
    </ul>
  );
}
```

### `useStepStarted(engine, name, callback)`

Fires when a step transitions to `RUNNING`. Callback ref is stable, no stale closures.

```tsx
useStepStarted(engine, 'fetch-user', async () => {
  const user = await api.getUser();
  engine.complete('fetch-user', 'SUCCESS');
});
```

### `useStepCompleted(engine, name, callback)`

Fires when a step transitions to `COMPLETE`, with the outcome.

```tsx
useStepCompleted(engine, 'fetch-user', (outcome) => {
  if (outcome === 'FAILURE') showErrorToast('Failed to load user');
});
```

### `useStepsReady(engine, callback)`

Fires whenever new steps become `READY`.

### `useAutoSchedule(engine)`

Convenience hook that automatically starts steps as they become ready. Useful when you don't need manual control over scheduling.

```tsx
function App() {
  useAutoSchedule(engine);
  // steps start immediately when ready, no manual engine.start() calls needed
}
```

## License

MIT
