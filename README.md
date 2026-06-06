# eventiq

DAG-based workflow orchestration for JavaScript.

## Install

```bash
npm install @eventiq/core
```

## Usage

```ts
import { EventiqEngine } from '@eventiq/core';

const engine = new EventiqEngine();

// 1. Define what to do when each step starts
engine.onStepStarted('fetch-user', async () => {
  const user = await api.getUser();
  engine.complete('fetch-user', 'SUCCESS');
});

engine.onStepStarted('fetch-posts', async () => {
  const posts = await api.getPosts();
  engine.complete('fetch-posts', 'SUCCESS');
});

engine.onStepStarted('fetch-comments', async () => {
  const comments = await api.getComments();
  engine.complete('fetch-comments', 'SUCCESS');
});

// 2. Auto-start steps when they become ready
engine.onStepsReady((names) => {
  for (const name of names) engine.start(name);
});

// 3. Submit a plan — the engine figures out the order
engine.submit({
  name: 'page-load',
  steps: [
    { name: 'fetch-user', needs: [] },
    { name: 'fetch-posts', needs: ['fetch-user'] },
    { name: 'fetch-comments', needs: ['fetch-posts'] },
  ],
});
```

That's it. `fetch-posts` waits for `fetch-user`. `fetch-comments` waits for `fetch-posts`. Steps without shared dependencies run in parallel automatically.

## Parallel steps

```ts
engine.submit({
  name: 'dashboard',
  steps: [
    { name: 'user', needs: [] },
    { name: 'permissions', needs: ['user'] },
    { name: 'notifications', needs: ['user'] },
    { name: 'config', needs: ['permissions'] },
  ],
});
```

```
user → permissions → config
  └──→ notifications
```

`permissions` and `notifications` both fire the instant `user` completes.

## Handling failures

```ts
engine.onStepStarted('fetch-user', async () => {
  try {
    await api.getUser();
    engine.complete('fetch-user', 'SUCCESS');
  } catch {
    engine.complete('fetch-user', 'FAILURE');
  }
});
```

When a step fails, its dependants stay blocked. Other branches keep running.

## Step lifecycle

Every step moves through: `BLOCKED` → `READY` → `RUNNING` → `COMPLETE`

```ts
const state = engine.getState();
state.queue[0].steps.forEach((step) => {
  console.log(step.name, step.status, step.outcome);
});
```

## React

```bash
npm install @eventiq/react
```

```tsx
import { useEventiqState, useStepStarted, useAutoSchedule } from '@eventiq/react';

function Page({ engine }) {
  useAutoSchedule(engine);
  const { queue } = useEventiqState(engine);

  useStepStarted(engine, 'fetch-user', async () => {
    await api.getUser();
    engine.complete('fetch-user', 'SUCCESS');
  });

  return (
    <ul>
      {queue[0]?.steps.map((step) => (
        <li key={step.id}>{step.name}: {step.status}</li>
      ))}
    </ul>
  );
}
```

## React Query

```bash
npm install @eventiq/react-query
```

```tsx
import { useEventiqQueries } from '@eventiq/react-query';

useEventiqQueries(engine, [
  { name: 'fetch-user', queryKey: ['user'], queryFn: api.getUser },
  { name: 'fetch-posts', queryKey: ['posts'], queryFn: api.getPosts },
]);

engine.submit(plan);
```

Steps fire in dependency order. Results live in the React Query cache.

## Redux Toolkit

```bash
npm install @eventiq/redux
```

```ts
import { createEventiqRedux } from '@eventiq/redux';

const eventiq = createEventiqRedux(engine);

const store = configureStore({
  reducer: { eventiq: eventiq.reducer },
  middleware: (gDM) => gDM().prepend(eventiq.listener.middleware),
});

eventiq.syncToStore(store.dispatch);
store.dispatch(eventiq.actions.planSubmitted(plan));
```

## Angular

```bash
npm install @eventiq/angular
```

```ts
import { EventiqService } from '@eventiq/angular';

@Component({ providers: [EventiqService] })
export class MyComponent {
  constructor(private eventiq: EventiqService) {
    this.eventiq.init(new EventiqEngine());
    this.eventiq.getStepsReady().subscribe((names) => {
      for (const name of names) this.eventiq.start(name);
    });
    this.eventiq.submit(plan);
  }
}
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

## Validation

`submit()` throws if:

- A step name is duplicated
- A step references a dependency that doesn't exist
- The graph has a cycle

## License

MIT
