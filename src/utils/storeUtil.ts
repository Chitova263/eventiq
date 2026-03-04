import { ExecutableEvent, EventConfig } from '../types/event.ts';

export class StoreUtil {
  public static getReadyEvents(queue: EventConfig<string, string, ExecutableEvent<string>>[]): ExecutableEvent<string>[] {
    return queue.flatMap((config) => config.events.filter((event) => event.status === 'READY'));
  }
}
