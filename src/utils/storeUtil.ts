import type { ExecutableEvent, ExecutablePlan } from '../types/planEvent.ts';

export class StoreUtil {
  public static getReadyEvents(queue: ExecutablePlan<string, string>[]): ExecutableEvent<string>[] {
    return queue.flatMap((plan) => plan.events.filter((event) => event.status === 'READY'));
  }
}
