# eventiq

[Live Demo](https://eventiq-three.vercel.app)

A dependency-aware event orchestration library for React + Redux Toolkit. Define execution plans as directed acyclic graphs, and eventiq handles scheduling, dependency resolution, and lifecycle tracking.

> **Note:** This library is experimental and not production-ready. APIs may change without notice. Use at your own risk.

## Why eventiq

Modern applications often involve complex async workflows - interdependent API calls, ordered initialization sequences, and coordinated loading states. eventiq provides a declarative approach to defining these workflows as dependency graphs, automatically resolving execution order and maximizing concurrency.

- **Declarative dependency graphs** - define relationships between events, not execution order
- **Automatic scheduling** - events execute as soon as their dependencies resolve
- **Parallel execution** - independent events run concurrently for optimal performance
- **Redux-native** - integrates seamlessly as a standard reducer + listener middleware
- **React hooks** - subscribe to event lifecycle directly from components
- **Type-safe** - fully generic over plan and event names

## Install

```bash
npm install @chitova263/eventiq@0.0.1
```

Peer dependencies: `react >= 18`, `react-dom >= 18`, `@reduxjs/toolkit >= 2`

## Quick start

### 1. Create an eventiq instance

```ts
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { createEventiq } from 'eventiq';

type EventName = 'fetch-user' | 'fetch-posts' | 'render';
type PlanName = 'page-load';

export const eventiq = createEventiq<PlanName, EventName>();

export const store = configureStore({
  reducer: {
    eventiq: eventiq.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .prepend(eventiq.listener.middleware),
});
```

### 2. Define an execution plan

```ts
import type { ExecutionPlan } from 'eventiq';

const plan: ExecutionPlan<'page-load', EventName> = {
  name: 'page-load',
  events: [
    { name: 'fetch-user', needs: [] },
    { name: 'fetch-posts', needs: ['fetch-user'] },
    { name: 'render', needs: ['fetch-posts'] },
  ],
};
```

Events with no dependencies (`needs: []`) start immediately. Events with dependencies wait until all dependencies complete successfully.

### 3. Wire up event handlers in React

```tsx
import { useDispatch } from 'react-redux';
import { eventiq } from './store';

function App() {
  const dispatch = useDispatch();

  eventiq.useEventStarted('fetch-user', async () => {
    const user = await fetchUser();
    dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-user' }));
  });

  eventiq.useEventStarted('fetch-posts', async () => {
    const posts = await fetchPosts();
    dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-posts' }));
  });

  eventiq.useEventStarted('render', () => {
    dispatch(eventiq.actions.eventSucceeded({ name: 'render' }));
  });

  return (
    <button onClick={() => dispatch(eventiq.actions.planSubmitted(plan))}>
      Start
    </button>
  );
}
```

## How it works: Example usecase

1. **Submit a plan** - `planSubmitted` adds the plan to the queue. Events with no dependencies are set to `READY`.
2. **Scheduling** - the listener middleware watches for plan submissions and event completions. When it sees `READY` events, it dispatches internal `started` actions.
3. **Execution** - your `useEventStarted` hooks fire. You do your async work and dispatch `eventSucceeded`, `eventFailed`, or `eventSkipped`.
4. **Unblocking** - when an event succeeds, the reducer checks if any blocked dependants now have all their dependencies met, and marks them `READY`.
5. **Repeat** - the middleware picks up the newly ready events and the cycle continues until all events complete.

## Using with your own reducers

eventiq handles orchestration. Your app owns its own state and side effects. A common pattern:

```ts
// Custom reducer for API responses
const apiSlice = createSlice({
  name: 'api',
  initialState: { user: null, posts: null },
  reducers: {
    setUser(state, action) { state.user = action.payload; },
    setPosts(state, action) { state.posts = action.payload; },
  },
});

// In your component — fetch data, store it, then signal eventiq
eventiq.useEventStarted('fetch-user', async () => {
  const user = await api.getUser();
  dispatch(apiSlice.actions.setUser(user));
  dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-user' }));
});

// Later events can read from the store
eventiq.useEventStarted('fetch-posts', async () => {
  const { user } = store.getState().api;
  const posts = await api.getPosts(user.id);
  dispatch(apiSlice.actions.setPosts(posts));
  dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-posts' }));
});
```


## API

### `createEventiq<TPlanName, TEventName>()`

Creates an eventiq instance. Returns:

| Property | Description |
|---|---|
| `actions.planSubmitted(plan)` | Dispatch to submit an execution plan |
| `actions.eventSucceeded({ name })` | Signal that an event completed successfully |
| `actions.eventFailed({ name })` | Signal that an event failed |
| `actions.eventSkipped({ name })` | Signal that an event was skipped |
| `reducer` | Redux reducer — mount at `state.eventiq` |
| `listener` | RTK listener middleware instance |
| `useEventStarted(name, callback)` | React hook — fires when an event begins executing |
| `useEventSucceeded(name, callback)` | React hook — fires when an event completes successfully |

### Execution plan

```ts
type ExecutionPlan<TPlanName, TEventName> = {
  name: TPlanName;
  events: PlanEvent<TEventName>[];
};

type PlanEvent<TEventName> = {
  name: TEventName;
  needs: TEventName[];  // dependencies that must complete first
};
```

### Event lifecycle

Each event goes through these statuses:

```
IDLE → BLOCKED → READY → RUNNING → COMPLETE
```

| Status | Meaning |
|---|---|
| `IDLE` | Initial state |
| `BLOCKED` | Waiting on dependencies |
| `READY` | All dependencies met, queued to start |
| `RUNNING` | Currently executing |
| `COMPLETE` | Finished (check `outcome` for result) |

Outcomes on completion: `SUCCESS`, `FAILURE`, or `SKIPPED`.

### Store state

The eventiq reducer manages this state shape:

```ts
{
  eventiq: {
    queue: ExecutablePlan[];       // submitted plans with live event state
    isQueueHandlingException: boolean;
  }
}
```

Each `ExecutablePlan` contains `ExecutableEvent` objects with `id`, `name`, `status`, `outcome`, `startTime`, `endTime`, `needs`, and `dependants`.

## Demo

The `demo/` directory contains a working app with two examples:

- **Dashboard Builder** - a widget-based dashboard that loads progressively (layout, theme, data, charts)
- **API Orchestration** - a profile page where mock API calls depend on each other's results

Both include a live pipeline visualization and a store inspector panel.

```bash
cd demo
npm install
npm run dev
```

## License

MIT
