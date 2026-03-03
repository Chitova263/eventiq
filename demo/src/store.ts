import { configureStore } from '@reduxjs/toolkit';
import { eventiqReducer, eventiqListener } from '../../src/index.ts';

export const store = configureStore({
  reducer: {
    eventiq: eventiqReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
    }).prepend(eventiqListener.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
