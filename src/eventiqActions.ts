import { createAction } from '@reduxjs/toolkit';
import { EventConfig } from './types/event.ts';

// Queue-level actions
export const eventConfigEnqueued = createAction<EventConfig<string, string>>(
  '[eventiq/queue] event config enqueued',
);

// Event-level actions
export const eventSucceeded = createAction<{ event: string }>(
  '[eventiq/event] event succeeded',
);
export const eventFailed = createAction<{ event: string }>(
  '[eventiq/event] event failed',
);
export const eventSkipped = createAction<{ event: string }>(
  '[eventiq/event] event skipped',
);

// Executable-level actions
export const executableStarted = createAction<{ event: string }>(
  '[eventiq/executable] executable started',
);
export const executableSucceeded = createAction<{
  event: string;
}>('[eventiq/executable] executable succeeded');
export const executableFailed = createAction<{
  event: string;
}>('[eventiq/executable] executable failed');
export const executableSkipped = createAction<{
  event: string;
}>('[eventiq/executable] executable skipped');
