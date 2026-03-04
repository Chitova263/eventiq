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

export function updateEvent(
  queue: ExecutableEvent<string>[],
  name: string,
  updates: Partial<ExecutableEvent<string>>,
): ExecutableEvent<string>[] {
  return queue.map((event) =>
    event.name === name ? { ...event, ...updates } : event,
  );
}

export function unblockDependants(
  queue: ExecutableEvent<string>[],
): ExecutableEvent<string>[] {
  return queue.map((event) => {
    if (event.status !== 'BLOCKED') return event;
    const allNeedsMet = event.needs.every((need) => {
      const actual = queue.find((e) => e.name === need.name);
      return (
        actual && (actual.status === 'COMPLETE' || actual.status === 'SKIPPED')
      );
    });
    return allNeedsMet ? { ...event, status: 'READY' as const } : event;
  });
}

export function skipDependants(
  queue: ExecutableEvent<string>[],
  failedName: string,
): ExecutableEvent<string>[] {
  let updated = queue.map((event) => {
    if (event.status !== 'BLOCKED') return event;
    const dependsOnFailed = event.needs.some(
      (need) => need.name === failedName,
    );
    if (!dependsOnFailed) return event;
    return {
      ...event,
      status: 'SKIPPED' as const,
      outcome: 'SKIPPED' as const,
      endTime: Date.now(),
    };
  });

  const newlySkipped = updated.filter(
    (e, i) => e.status === 'SKIPPED' && queue[i].status !== 'SKIPPED',
  );
  for (const skipped of newlySkipped) {
    updated = skipDependants(updated, skipped.name);
  }

  return updated;
}
