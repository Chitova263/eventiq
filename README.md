# eventiq

[Live Demo](https://eventiq-three.vercel.app)

A dependency-aware event orchestration library for React + Redux Toolkit. Define execution plans as directed acyclic graphs (DAGs), and eventiq handles scheduling, dependency resolution, concurrent execution, and lifecycle tracking. 

eventiq implements an incremental variant of Kahn's algorithm, executed reactively across Redux reducer and middleware cycles:


## Why eventiq

Modern applications involve complex async workflows — interdependent API calls, ordered initialization sequences, and coordinated loading states. eventiq provides a declarative approach to defining these workflows as dependency graphs, automatically resolving execution order and maximizing concurrency.

- **Declarative dependency graphs** — define relationships between events, not execution order
- **Automatic concurrent scheduling** — events execute as soon as their dependencies resolve, independent events run in parallel
- **DAG validation** — circular dependencies, duplicate event names, and missing dependency references are caught at plan submission time
- **Redux-native** — integrates as a standard reducer + listener middleware
- **React hooks** — subscribe to event lifecycle directly from components
- **Type-safe** — fully generic over plan and event names

## Install

```bash
npm install @chitova263/eventiq@0.0.1
```

Peer dependencies: `react >= 18`, `react-dom >= 18`, `@reduxjs/toolkit >= 2`

## Quick start

### 1. Create an eventiq instance and configure the store

```ts
// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { createEventiq } from 'eventiq';
import { apiSlice } from './apiSlice';

type EventName = 'fetch-user' | 'fetch-posts' | 'fetch-analytics';
type PlanName = 'profile-load';

export const eventiq = createEventiq<PlanName, EventName>();

export const store = configureStore({
    reducer: {
        eventiq: eventiq.reducer,
        api: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false })
            .prepend(eventiq.listener.middleware),
});
```

### 2. Define the execution plan

```ts
import type { ExecutionPlan } from 'eventiq';

const profilePlan: ExecutionPlan<PlanName, EventName> = {
    name: 'profile-load',
    events: [
        { name: 'fetch-user', needs: [] },
        { name: 'fetch-posts', needs: ['fetch-user'] },
        { name: 'fetch-analytics', needs: ['fetch-posts'] },
    ],
};
```

### 3. Define trigger actions and set up listeners

Listeners handle all async work — API calls, state updates, and eventiq signaling.

```ts
// actions.ts
import { createAction } from '@reduxjs/toolkit';

export const fetchUser = createAction('api/fetchUser');
export const fetchPosts = createAction('api/fetchPosts');
export const fetchAnalytics = createAction('api/fetchAnalytics');
```

```ts
// listeners.ts
import { eventiq, store } from './store';
import { apiSlice } from './apiSlice';
import { fetchUser, fetchPosts, fetchAnalytics } from './actions';
import * as api from './api';

eventiq.listener.startListening({
    actionCreator: fetchUser,
    effect: async (_, listenerApi) => {
        try {
            const user = await api.getUser();
            listenerApi.dispatch(apiSlice.actions.setUser(user));
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-user', outcome: 'SUCCESS' }));
        } catch {
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-user', outcome: 'FAILURE' }));
        }
    },
});

eventiq.listener.startListening({
    actionCreator: fetchPosts,
    effect: async (_, listenerApi) => {
        try {
            const { user } = listenerApi.getState().api;
            const posts = await api.getPosts(user!.id);
            listenerApi.dispatch(apiSlice.actions.setPosts(posts));
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-posts', outcome: 'SUCCESS' }));
        } catch {
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-posts', outcome: 'FAILURE' }));
        }
    },
});

eventiq.listener.startListening({
    actionCreator: fetchAnalytics,
    effect: async (_, listenerApi) => {
        try {
            const { posts } = listenerApi.getState().api;
            const analytics = await api.getAnalytics(posts!.map(p => p.id));
            listenerApi.dispatch(apiSlice.actions.setAnalytics(analytics));
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-analytics', outcome: 'SUCCESS' }));
        } catch {
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-analytics', outcome: 'FAILURE' }));
        }
    },
});
```

### 4. Component dispatches actions

Components only dispatch — no async logic, no direct API calls.

```tsx
// ProfilePage.tsx
import { useDispatch } from 'react-redux';
import { eventiq } from './store';
import { fetchUser, fetchPosts, fetchAnalytics } from './actions';

function ProfilePage() {
    const dispatch = useDispatch();

    eventiq.useEventStarted('fetch-user', () => dispatch(fetchUser()));
    eventiq.useEventStarted('fetch-posts', () => dispatch(fetchPosts()));
    eventiq.useEventStarted('fetch-analytics', () => dispatch(fetchAnalytics()));

    return (
        <button onClick={() => dispatch(eventiq.actions.planSubmitted(profilePlan))}>
            Load Profile
        </button>
    );
}
```

**The flow:**
1. Component dispatches `planSubmitted`. eventiq marks `fetch-user` as `READY` (no dependencies).
2. The scheduler fires `started` for `fetch-user`. The `useEventStarted` hook dispatches `fetchUser()`.
3. The listener catches `fetchUser`, calls the API, stores the result, and dispatches `completed`.
4. `completed` with `SUCCESS` unblocks `fetch-posts`. The scheduler starts it, the hook dispatches `fetchPosts()`, and the listener takes over again.
5. This continues until all events complete. If any listener catches an error, `FAILURE` stops that branch.

## Execution model

eventiq implements an incremental variant of Kahn's algorithm, executed reactively across Redux reducer and middleware cycles:

1. `planSubmitted` → the reducer converts plan events into `ExecutableEvent` objects. Events with no dependencies are marked `READY`, others are `BLOCKED`.
2. A listener middleware reacts to `planSubmitted` and `completed` actions → finds all `READY` events → dispatches internal `started` actions for each.
3. `started` → the reducer transitions the event to `RUNNING`. The `useEventStarted` hook fires the user-provided callback.
4. User code completes work and dispatches `completed({ name, outcome })`. If the outcome is `SUCCESS` or `SKIPPED`, the reducer marks the event `COMPLETE` and unblocks dependants whose needs are now all met.
5. Newly unblocked events become `READY`, the listener picks them up, and the cycle continues until the DAG is fully resolved.

This reactive approach provides maximum concurrency — independent events run in parallel without any pre-computed ordering step.

## Plan validation

On `planSubmitted`, eventiq validates the execution plan before it enters the queue. The following conditions throw synchronously in the reducer:

| Validation | Error |
|---|---|
| Duplicate event names | `Duplicate event name "X"` |
| Reference to undefined dependency | `Event "X" depends on "Y" which doesn't exist in the plan` |
| Circular dependencies (Kahn's algorithm) | `Circular dependency detected among events: [X, Y, Z]` |

These checks ensure only valid DAGs are scheduled.

## Error handling

Use the `outcome` field on `completed` to control pipeline behavior:

```ts
eventiq.listener.startListening({
    actionCreator: fetchPosts,
    effect: async (_, listenerApi) => {
        try {
            const posts = await api.getPosts(userId);
            listenerApi.dispatch(apiSlice.actions.setPosts(posts));
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-posts', outcome: 'SUCCESS' }));
        } catch {
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-posts', outcome: 'FAILURE' }));
        }
    },
});
```

| Outcome | Effect on dependants |
|---|---|
| `SUCCESS` | Dependants are unblocked |
| `SKIPPED` | Dependants are unblocked (treated as a successful completion) |
| `FAILURE` | Dependants remain `BLOCKED` — the pipeline halts on that branch |

### Conditional skipping

Skip an event based on runtime state. Downstream events still unblock:

```ts
eventiq.listener.startListening({
    actionCreator: fetchPremiumContent,
    effect: async (_, listenerApi) => {
        const { user } = listenerApi.getState().api;
        if (!user!.isPremium) {
            listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-premium-content', outcome: 'SKIPPED' }));
            return;
        }
        const content = await api.getPremiumContent(user!.id);
        listenerApi.dispatch(apiSlice.actions.setPremiumContent(content));
        listenerApi.dispatch(eventiq.actions.completed({ name: 'fetch-premium-content', outcome: 'SUCCESS' }));
    },
});
```

## API reference

### `createEventiq<TPlanName, TEventName>()`

Creates an eventiq instance. Returns:

| Property | Type | Description |
|---|---|---|
| `actions.planSubmitted(plan)` | `ActionCreator` | Submit an execution plan to the queue |
| `actions.completed({ name, outcome })` | `ActionCreator` | Signal event completion with outcome |
| `reducer` | `Reducer` | Redux reducer — mount at `state.eventiq` |
| `listener` | `ListenerMiddlewareInstance` | RTK listener middleware — prepend to middleware chain |
| `selectors.selectQueue(state)` | `Selector` | Select the execution queue |
| `selectors.selectReadyEvents(state)` | `Selector` | Select events in `READY` status |
| `useEventStarted(name, callback)` | `Hook` | Fires when an event begins executing |
| `useEventSucceeded(name, callback)` | `Hook` | Fires when internal scheduling marks an event succeeded |

### `ExecutionPlan<TPlanName, TEventName>`

```ts
type ExecutionPlan<TPlanName, TEventName> = {
    name: TPlanName;
    events: PlanEvent<TEventName>[];
};

type PlanEvent<TEventName> = {
    name: TEventName;
    needs: TEventName[];  // dependencies that must complete before this event starts
};
```

### `ExecutionOutcome`

```ts
type ExecutionOutcome = 'SUCCESS' | 'FAILURE' | 'SKIPPED';
```

### Event lifecycle

```
IDLE → READY (no deps) or BLOCKED (has deps)
BLOCKED → READY (when all needs complete with SUCCESS or SKIPPED)
READY → RUNNING (scheduler picks up)
RUNNING → COMPLETE (user dispatches completed)
```

| Status | Description |
|---|---|
| `IDLE` | Initial state during plan construction |
| `BLOCKED` | Waiting on one or more dependencies to complete |
| `READY` | All dependencies satisfied, queued for execution |
| `RUNNING` | Currently executing user-provided callback |
| `COMPLETE` | Finished — check `outcome` for `SUCCESS`, `FAILURE`, or `SKIPPED` |

### Store state shape

```ts
{
    eventiq: {
        queue: ExecutablePlan[];
        isQueueHandlingException: boolean;
    }
}
```

Each `ExecutablePlan` contains `ExecutableEvent` objects:

```ts
type ExecutableEvent<TEventName> = {
    id: string;
    name: TEventName;
    status: ExecutionStatus;
    outcome: ExecutionOutcome | null;
    needs: ExecutableEvent<TEventName>[];
    dependants: ExecutableEventDependant<TEventName>[];
    startTime: number | null;
    endTime: number | null;
};
```

## Demo

The `demo/` directory contains a working example:

- **API Orchestration** — a profile page where mock API calls depend on each other's results, demonstrating fan-out from a single root event

Includes a live pipeline visualization and a store inspector panel.

```bash
cd demo
npm install
npm run dev
```

## License

MIT
