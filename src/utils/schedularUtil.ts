import { ExecutableEvent } from 'eventiq';
import { EventiqDispatch, EventiqSchedulingActions } from '../types/event.ts';

export class SchedulerUtil {
  public static startReadyEvents<TEventName extends string>(
    events: ExecutableEvent<string>[],
    dispatch: EventiqDispatch,
    eventiqSchedulingActions: EventiqSchedulingActions<TEventName>,
  ) {
    for (const event of events) {
      dispatch(
        eventiqSchedulingActions.started({
          event: event.name as TEventName,
        }),
      );
    }
  }
}
