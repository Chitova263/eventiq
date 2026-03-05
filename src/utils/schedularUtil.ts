import type { ExecutableEvent } from '../types/planEvent.ts';
import type { EventiqDispatch, EventiqEventSchedularActions } from '../types/planEvent.ts';

export class SchedulerUtil {
  public static startReadyEvents<TEventName extends string>(
    events: ExecutableEvent<string>[],
    dispatch: EventiqDispatch,
    eventiqSchedulingActions: EventiqEventSchedularActions<TEventName>,
  ) {
    for (const event of events) {
      dispatch(
        eventiqSchedulingActions.started({
          name: event.name as TEventName,
        }),
      );
    }
  }
}
