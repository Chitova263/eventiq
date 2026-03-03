import { Event, ExecutableEvent } from '../types/event.ts';

export function transformToExecutableEvents<TEventName extends string>(
  events: Event<TEventName>[],
): ExecutableEvent<TEventName>[] {
  const eventMap = new Map<TEventName, ExecutableEvent<TEventName>>();

  for (const event of events) {
    eventMap.set(event.name, {
      id: crypto.randomUUID(),
      name: event.name,
      status: 'IDLE',
      needs: [],
      dependants: [],
      outcome: null,
      startTime: null,
      endTime: null,
    });
  }

  for (const event of events) {
    const executableEvent = eventMap.get(event.name)!;

    for (const needName of event.needs) {
      const dependency = eventMap.get(needName);
      if (dependency) {
        executableEvent.needs.push(dependency);
        dependency.dependants.push({
          id: executableEvent.id,
          name: executableEvent.name,
        });
      }
    }
  }

  for (const executableEvent of eventMap.values()) {
    executableEvent.status =
      executableEvent.needs.length === 0 ? 'READY' : 'BLOCKED';
  }

  return Array.from(eventMap.values());
}
