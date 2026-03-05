import { configureStore } from '@reduxjs/toolkit';
import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { createEventiq } from '../../src/index.ts';
import { apiSlice } from './api/apiSlice.ts';
import type { DemoEventName, DemoPlanName } from './types.ts';
import type { EventiqType } from '../../src/core/createEventiq.ts';

export const eventiq: EventiqType<DemoPlanName, DemoEventName> = createEventiq();

// Action log — captured by middleware, read by StoreVisualizer
export interface ActionLogEntry {
  type: string;
  timestamp: number;
}
export const actionLog: ActionLogEntry[] = [];

const actionLogMiddleware: Middleware = () => (next) => (action: UnknownAction) => {
  const result = next(action);
  actionLog.push({ type: action.type as string, timestamp: Date.now() });
  return result;
};

export const store = configureStore({
  reducer: {
    eventiq: eventiq.reducer,
    api: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
      .prepend(eventiq.listener.middleware)
      .concat(actionLogMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
