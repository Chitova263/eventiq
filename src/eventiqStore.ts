import { ExecutableEvent } from './types/event.ts';

export type EventiqState = {
  queue: ExecutableEvent<string>[];
};
