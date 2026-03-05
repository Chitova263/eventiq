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

### 1. Create an eventiq instance and store

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

### 2. Define your app state and trigger actions

```ts
// apiSlice.ts
import { createSlice, createAction } from '@reduxjs/toolkit';

export const fetchUser = createAction('api/fetchUser');
export const fetchPosts = createAction('api/fetchPosts');
export const fetchAnalytics = createAction('api/fetchAnalytics');

export const apiSlice = createSlice({
    name: 'api',
    initialState: { user: null, posts: null, analytics: null },
    reducers: {
        setUser(state, action) { state.user = action.payload; },
        setPosts(state, action) { state.posts = action.payload; },
        setAnalytics(state, action) { state.analytics = action.payload; },
    },
});
```

### 3. Set up listeners to handle side effects

```ts
// listeners.ts
import { apiSlice, fetchUser, fetchPosts, fetchAnalytics } from './apiSlice';
import { eventiq } from './store';
import * as api from './api';

eventiq.listener.startListening({
    actionCreator: fetchUser,
    effect: async (action, listenerApi) => {
        const user = await api.getUser();
        listenerApi.dispatch(apiSlice.actions.setUser(user));
        listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-user' }));
    },
});

eventiq.listener.startListening({
    actionCreator: fetchPosts,
    effect: async (action, listenerApi) => {
        const { user } = listenerApi.getState().api;
        const posts = await api.getPosts(user.id);
        listenerApi.dispatch(apiSlice.actions.setPosts(posts));
        listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-posts' }));
    },
});

eventiq.listener.startListening({
    actionCreator: fetchAnalytics,
    effect: async (action, listenerApi) => {
        const { posts } = listenerApi.getState().api;
        const analytics = await api.getAnalytics(posts.map(p => p.id));
        listenerApi.dispatch(apiSlice.actions.setAnalytics(analytics));
        listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-analytics' }));
    },
});
```

### 4. Component dispatches actions

```tsx
// ProfilePage.tsx
import { useDispatch } from 'react-redux';
import { eventiq } from './store';
import { fetchUser, fetchPosts, fetchAnalytics } from './apiSlice';
import type { ExecutionPlan } from 'eventiq';

const profilePlan: ExecutionPlan<'profile-load', EventName> = {
    name: 'profile-load',
    events: [
        { name: 'fetch-user', needs: [] },
        { name: 'fetch-posts', needs: ['fetch-user'] },
        { name: 'fetch-analytics', needs: ['fetch-posts'] },
    ],
};

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

The component's only job is to dispatch. All API calls, state updates, and eventiq signaling happen in listeners.

## How it works: Realistic API orchestration

Imagine a profile page that loads a user, then fetches their posts, and finally fetches analytics, each step depending on data from the previous one. The key pattern: **components only dispatch actions**, and **all async/API logic lives in listeners**.

### 1. Define your app state and actions

```ts
// apiSlice.ts
import { createSlice, createAction } from '@reduxjs/toolkit';

// Actions the component dispatches to kick off each fetch
export const fetchUser = createAction('api/fetchUser');
export const fetchPosts = createAction('api/fetchPosts');
export const fetchAnalytics = createAction('api/fetchAnalytics');

export const apiSlice = createSlice({
    name: 'api',
    initialState: {
        user: null as User | null,
        posts: null as Post[] | null,
        analytics: null as Analytics | null,
        error: null as string | null,
    },
    reducers: {
        setUser(state, action) { state.user = action.payload; },
        setPosts(state, action) { state.posts = action.payload; },
        setAnalytics(state, action) { state.analytics = action.payload; },
        setError(state, action) { state.error = action.payload; },
    },
});
```

### 2. Define the execution plan

```ts
type EventName = 'fetch-user' | 'fetch-posts' | 'fetch-analytics';
type PlanName = 'profile-load';

const profilePlan: ExecutionPlan<PlanName, EventName> = {
    name: 'profile-load',
    events: [
        { name: 'fetch-user', needs: [] },
        { name: 'fetch-posts', needs: ['fetch-user'] },
        { name: 'fetch-analytics', needs: ['fetch-posts'] },
    ],
};
```

### 3. Set up listeners

Listeners listen for the actions your component dispatches, do the async work, store results, and signal eventiq.

```ts
// listeners.ts
import { apiSlice, fetchUser, fetchPosts, fetchAnalytics } from './apiSlice';
import { eventiq } from './store';
import * as api from './api';

// fetch-user: call API, store result, signal eventiq
eventiq.listener.startListening({
    actionCreator: fetchUser,
    effect: async (action, listenerApi) => {
        try {
            const user = await api.getUser();
            listenerApi.dispatch(apiSlice.actions.setUser(user));
            listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-user' }));
        } catch (err) {
            listenerApi.dispatch(apiSlice.actions.setError('Failed to load user'));
            listenerApi.dispatch(eventiq.actions.eventFailed({ name: 'fetch-user' }));
        }
    },
});

// fetch-posts: read user from store, call API, signal eventiq
eventiq.listener.startListening({
    actionCreator: fetchPosts,
    effect: async (action, listenerApi) => {
        try {
            const { user } = listenerApi.getState().api;
            const posts = await api.getPosts(user!.id);
            listenerApi.dispatch(apiSlice.actions.setPosts(posts));
            listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-posts' }));
        } catch (err) {
            listenerApi.dispatch(apiSlice.actions.setError('Failed to load posts'));
            listenerApi.dispatch(eventiq.actions.eventFailed({ name: 'fetch-posts' }));
        }
    },
});

// fetch-analytics: read posts from store, call API, signal eventiq
eventiq.listener.startListening({
    actionCreator: fetchAnalytics,
    effect: async (action, listenerApi) => {
        try {
            const { posts } = listenerApi.getState().api;
            const analytics = await api.getAnalytics(posts!.map(p => p.id));
            listenerApi.dispatch(apiSlice.actions.setAnalytics(analytics));
            listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-analytics' }));
        } catch (err) {
            listenerApi.dispatch(apiSlice.actions.setError('Failed to load analytics'));
            listenerApi.dispatch(eventiq.actions.eventFailed({ name: 'fetch-analytics' }));
        }
    },
});
```

### 4. Component just dispatches actions
```tsx
// ProfilePage.tsx
function ProfilePage() {
    const dispatch = useDispatch();

    // When eventiq starts each event, dispatch the corresponding action.
    // The listener handles everything from there.
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
3. The listener catches `fetchUser`, calls the API, stores the user, and dispatches `eventSucceeded`.
4. `eventSucceeded` unblocks `fetch-posts`. The scheduler starts it, the hook dispatches `fetchPosts()`, and the listener takes over again.
5. This continues until all events complete. If any listener throws, `eventFailed` stops that branch.

### 5. Conditional logic : Skip events based on store state

Sometimes you want to skip an event based on what previous steps produced. Check the store in your listener and dispatch `eventSkipped` - eventiq treats it as a completion, so downstream events still unblock.

```ts
// actions
export const fetchPremiumContent = createAction('api/fetchPremiumContent');

// plan
const plan: ExecutionPlan<PlanName, EventName> = {
    name: 'profile-load',
    events: [
        { name: 'fetch-user', needs: [] },
        { name: 'fetch-posts', needs: ['fetch-user'] },
        { name: 'fetch-premium-content', needs: ['fetch-user'] },
        { name: 'render', needs: ['fetch-posts', 'fetch-premium-content'] },
    ],
};

// listener - skip the API call if user isn't premium
eventiq.listener.startListening({
    actionCreator: fetchPremiumContent,
    effect: async (action, listenerApi) => {
        const { user } = listenerApi.getState().api;

        if (!user!.isPremium) {
            // No API call needed. Downstream events still unblock.
            listenerApi.dispatch(eventiq.actions.eventSkipped({ name: 'fetch-premium-content' }));
            return;
        }

        try {
            const content = await api.getPremiumContent(user!.id);
            listenerApi.dispatch(apiSlice.actions.setPremiumContent(content));
            listenerApi.dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-premium-content' }));
        } catch (err) {
            listenerApi.dispatch(eventiq.actions.eventFailed({ name: 'fetch-premium-content' }));
        }
    },
});

// component - still just dispatches
eventiq.useEventStarted('fetch-premium-content', () => dispatch(fetchPremiumContent()));
```

**Key points:**
- `eventSkipped` counts as a completion — dependants still unblock
- `eventFailed` does **not** unblock dependants — the pipeline stops at that branch
- Listeners read from the store via `listenerApi.getState()` to make runtime decisions based on data from earlier events
- Components never contain async logic — they only dispatch actions


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
