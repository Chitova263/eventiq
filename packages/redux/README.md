# @eventiq/redux

Redux Toolkit adapter for `@eventiq/core`. Bridges the engine into a Redux store via actions and listener middleware.

## Install

```bash
npm install @eventiq/core @eventiq/redux
```

## Setup

```ts
import { configureStore } from '@reduxjs/toolkit';
import { EventiqEngine } from '@eventiq/core';
import { createEventiqRedux } from '@eventiq/redux';

const engine = new EventiqEngine();
const eventiq = createEventiqRedux(engine);

const store = configureStore({
  reducer: {
    eventiq: eventiq.reducer,
  },
  middleware: (getDefault) =>
    getDefault().prepend(eventiq.listener.middleware),
});

// Sync engine state → Redux store
eventiq.syncToStore(store.dispatch);
```

## Dispatching plans

```ts
store.dispatch(eventiq.actions.planSubmitted({
  name: 'deploy',
  steps: [
    { name: 'checkout', needs: [] },
    { name: 'build', needs: ['checkout'] },
  ],
}));
```

## Completing steps

```ts
store.dispatch(eventiq.actions.completed({ name: 'checkout', outcome: 'SUCCESS' }));
```

## How it works

1. Redux actions (`planSubmitted`, `completed`) are intercepted by listener middleware and forwarded to the engine
2. The engine processes commands and updates its internal state
3. `syncToStore` pushes engine state into Redux via a `stateSync` action
4. Ready steps are auto-started by the engine

Use this adapter when your app already relies on Redux for state management and you want eventiq state available via selectors and Redux DevTools.

## License

MIT
