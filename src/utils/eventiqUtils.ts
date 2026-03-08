import type {
  ExecutableEvent,
  ExecutableEventDependant,
  ExecutablePlan,
  ExecutionOutcome,
  ExecutionPlan,
  ExecutionStatus,
  PlanEvent,
} from '../types/planEvent.ts';

export class EventiqStoreUtils {
  public static generateExecutablePlan<TPlanName extends string, TEventName extends string>(
    executionPlan: ExecutionPlan<TPlanName, TEventName>,
  ): ExecutablePlan<TPlanName, TEventName> {
    return {
      name: executionPlan.name,
      events: EventiqStoreUtils.mapPlanEventsToExecutableEvents(executionPlan.events),
    };
  }

  public static unblockCompletedEventDependants<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
    completedName: string,
  ): ExecutablePlan<TPlanName, TEventName>[] {
    return queue.map((plan) => ({
      ...plan,
      events: plan.events.map((event) => {
        if (event.status !== 'BLOCKED') return event;
        const dependsOnCompleted = event.needs.some((need) => need.name === completedName);
        if (!dependsOnCompleted) return event;
        const allNeedsMet = event.needs.every(
          (need) => plan.events.find((e) => e.name === need.name)?.status === 'COMPLETE',
        );
        if (!allNeedsMet) return event;
        return { ...event, status: 'READY' };
      }),
    }));
  }

  public static completeExecutableEvent<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
    name: TEventName,
    outcome: ExecutionOutcome,
  ): ExecutablePlan<TPlanName, TEventName>[] {
    return queue.map((plan): ExecutablePlan<TPlanName, TEventName> => {
      return {
        ...plan,
        events: plan.events.map((event): ExecutableEvent<TEventName> => {
          if (event.name !== name) return event;
          return { ...event, status: 'COMPLETE', outcome, endTime: Date.now() };
        }),
      };
    });
  }

  public static updateExecutableEventStatus<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
    name: TEventName,
    status: ExecutionStatus,
  ): ExecutablePlan<TPlanName, TEventName>[] {
    return queue.map(
      (plan: ExecutablePlan<TPlanName, TEventName>): ExecutablePlan<TPlanName, TEventName> => ({
        ...plan,
        events: plan.events.map((event: ExecutableEvent<TEventName>): ExecutableEvent<TEventName> => {
          if (event.name !== name) return event;
          return { ...event, status };
        }),
      }),
    );
  }

  public static throwIfEventNotExist<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
    name: TEventName,
  ): void {
    for (const plan of queue) {
      const executableEvent = plan.events.find((evt) => evt.name === name);
      if (executableEvent) {
        return;
      }
    }
    throw new Error(`[Eventiq] Cannot process event "${name}": no matching event exists in the queue`);
  }

  public static getReadyEvents<TPlanName extends string, TEventName extends string>(
    queue: ExecutablePlan<TPlanName, TEventName>[],
  ): ExecutableEvent<TEventName>[] {
    return queue.flatMap((plan) => plan.events.filter((event) => event.status === 'READY'));
  }

  private static mapPlanEventsToExecutableEvents<TEventName extends string>(
    events: PlanEvent<TEventName>[],
  ): ExecutableEvent<TEventName>[] {
    const eventMap = new Map<TEventName, ExecutableEvent<TEventName>>();

    for (const event of events) {
      if (eventMap.has(event.name)) {
        throw new Error(`Duplicate event name "${event.name}"`);
      }
      eventMap.set(event.name, EventiqStoreUtils.getIdleExecutableEvent(event));
    }

    for (const event of events) {
      const executableEvent = eventMap.get(event.name)!;
      for (const needName of event.needs) {
        const dependency = eventMap.get(needName);
        if (!dependency) {
          throw new Error(`Event "${event.name}" depends on "${needName}" which doesn't exist in the plan`);
        }
        executableEvent.needs.push(dependency);
        dependency.dependants.push({
          id: executableEvent.id,
          name: executableEvent.name,
        });
      }

      if (executableEvent.needs.length === 0) {
        executableEvent.status = 'READY';
      } else {
        executableEvent.status = 'BLOCKED';
      }
    }

    return Array.from(eventMap.values());
  }

  private static getIdleExecutableEvent<TEventName extends string>(
    event: PlanEvent<TEventName>,
  ): ExecutableEvent<TEventName> {
    return {
      id: crypto.randomUUID(),
      name: event.name,
      status: 'IDLE',
      needs: [],
      dependants: [],
      outcome: null,
      startTime: null,
      endTime: null,
    };
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
