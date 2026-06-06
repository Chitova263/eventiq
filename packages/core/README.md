# @eventiq/core

The engine. Zero dependencies.

## Install

```bash
npm install @eventiq/core
```

## Usage

```ts
import { EventiqEngine } from '@eventiq/core';

const engine = new EventiqEngine();

engine.onStepsReady((names) => {
  for (const name of names) engine.start(name);
});

engine.onStepStarted('fetch-user', async () => {
  await api.getUser();
  engine.complete('fetch-user', 'SUCCESS');
});

engine.onStepStarted('fetch-posts', async () => {
  await api.getPosts();
  engine.complete('fetch-posts', 'SUCCESS');
});

engine.submit({
  name: 'page-load',
  steps: [
    { name: 'fetch-user', needs: [] },
    { name: 'fetch-posts', needs: ['fetch-user'] },
  ],
});
```

## API

| Method | Description |
|--------|-------------|
| `submit(plan)` | Validate and queue a plan. Root steps become READY. |
| `start(name)` | READY → RUNNING |
| `complete(name, outcome)` | RUNNING → COMPLETE. Unblocks dependants on SUCCESS/SKIPPED. |
| `getState()` | Current state snapshot. |
| `getReadySteps()` | All steps with status READY. |
| `subscribe(cb)` | Fires on state change. Returns unsubscribe fn. |
| `onStepsReady(cb)` | Fires when new steps become READY. |
| `onStepStarted(name, cb)` | Fires when a step starts. |
| `onStepCompleted(name, cb)` | Fires when a step completes. |
| `dispose()` | Tear down all listeners. |

## Step lifecycle

```
BLOCKED → READY → RUNNING → COMPLETE
```

## Outcomes

| Outcome | Effect |
|---------|--------|
| `SUCCESS` | Dependants unblocked |
| `SKIPPED` | Dependants unblocked |
| `FAILURE` | Dependants stay blocked |

## Validation

`submit()` throws if a step name is duplicated, a dependency doesn't exist, or the graph has a cycle.

## License

MIT
