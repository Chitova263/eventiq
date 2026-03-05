import {
  PlanEvent,
  ExecutableEvent,
  ExecutablePlan,
  ExecutionPlan,
  ExecutableEventDependant,
} from '../types/planEvent.ts';

export class EventiqStoreUtils {
  public static mapExecutionPlanExecutablePlan<TPlanName extends string, TEventName extends string>(
    executionPlan: ExecutionPlan<TPlanName, TEventName>,
  ): ExecutablePlan<TPlanName, TEventName> {
    return {
      name: executionPlan.name,
      events: EventiqStoreUtils.mapPlanEventsToExecutableEvents(executionPlan.events),
    };
  }

  private static mapPlanEventsToExecutableEvents<TEventName extends string>(
    events: readonly PlanEvent<TEventName>[],
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
      const needs = executableEvent.needs;
      const needNames = Array.isArray(event.needs) ? event.needs : [];

      for (const needName of needNames) {
        const dependency = eventMap.get(needName);
        if (dependency) {
          needs.push(dependency);
          dependency.dependants.push({
            id: executableEvent.id,
            name: executableEvent.name,
          });
        }
      }
    }

    for (const executableEvent of eventMap.values()) {
      if (executableEvent.needs.length === 0) {
        executableEvent.status = 'READY';
      } else {
        executableEvent.status = 'BLOCKED';
      }
    }

    return Array.from(eventMap.values());
  }

  public static findExecutableEventByName<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
    name: TEventName,
  ): ExecutableEvent<TEventName> | null {
    for (const plan of queue) {
      const executableEvent = plan.events.find((evt) => evt.name === name);
      if (executableEvent) {
        return executableEvent;
      }
    }
    return null;
  }

  public static unblockEventDependants<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
    executableEvent: ExecutableEvent<TEventName>,
  ): void {
    const unblockEventIds = executableEvent.dependants.map((evt: ExecutableEventDependant<TEventName>) => evt.id);
    const unblockEventIdSet = new Set(unblockEventIds);
    for (const plan of queue) {
      for (const candidateExecutableEvent of plan.events) {
        if (unblockEventIdSet.has(candidateExecutableEvent.id)) {
          // Check if event's needs all have completed successfully
          const needs = EventiqStoreUtils.findEventNeedsExecutableEvents(candidateExecutableEvent.name, queue);
          const allNeedsCompleted = needs.every((need) => need.status === 'COMPLETE');
          if (needs.length > 0 && allNeedsCompleted) {
            candidateExecutableEvent.status = 'READY';
            candidateExecutableEvent.startTime = Date.now();
          }
        }
      }
    }
  }

  private static findEventNeedsExecutableEvents<TPlanName extends string, TEventName extends string>(
    name: TEventName,
    queue: ExecutablePlan<TPlanName, TEventName>[],
  ): ExecutableEvent<TEventName>[] {
    for (const plan of queue) {
      const event = plan.events.find((evt) => evt.name === name);
      if (event) {
        const needNames = event.needs.map((need) => need.name);
        return plan.events.filter((evt) => needNames.includes(evt.name));
      }
    }
    return [];
  }
}

// export function skipDependants(
//   queue: readonly ExecutableEvent<string>[],
//   failedName: string,
// ): ExecutableEvent<string>[] {
//   let updated = queue.map((event) => {
//     if (event.status !== 'BLOCKED') return event;
//     const dependsOnFailed = event.needs.some((need) => need.name === failedName);
//     if (!dependsOnFailed) return event;
//     return {
//       ...event,
//       status: 'SKIPPED' as const,
//       outcome: 'SKIPPED' as const,
//       endTime: Date.now(),
//     };
//   });
//
//   const newlySkipped = updated.filter((e, i) => e.status === 'SKIPPED' && queue[i].status !== 'SKIPPED');
//   for (const skipped of newlySkipped) {
//     updated = skipDependants(updated, skipped.name);
//   }
//
//   return updated
//
// }
