import { configureStore } from '@reduxjs/toolkit';
import { createEventiq } from '../../src/index.ts';
import type { DemoEventNameType, DemoExecutableConfigurationNameType } from './App.tsx';
import type { EventiqType } from '../../src/core/createEventiq.ts';

export const eventiq: EventiqType<DemoExecutableConfigurationNameType, DemoEventNameType> = createEventiq();

export const store = configureStore({
  reducer: {
    eventiq: eventiq.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
    }).prepend(eventiq.listener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
