import { createEventiqActions } from './actions.ts';
import { createEventiqSchedularActions } from './actions.ts';
import { createEventiqReducer } from './reducer.ts';
import { createEventiqListenerMiddleware } from './middleware.ts';
import { createEventiqHooks } from '../hooks/createEventiqHooks.ts';
import type { EventiqActions, EventiqEventSchedularActions } from '../types/planEvent.ts';

export function createEventiq<TPlanName extends string, TEventName extends string>() {
  const eventiqActions: EventiqActions<TPlanName, TEventName> = createEventiqActions();
  const eventiqEventSchedularActions: EventiqEventSchedularActions<TEventName> =
    createEventiqSchedularActions<TEventName>();
  const reducer = createEventiqReducer(eventiqActions, eventiqEventSchedularActions);
  const listener = createEventiqListenerMiddleware(eventiqActions, eventiqEventSchedularActions);
  const hooks = createEventiqHooks(listener, eventiqEventSchedularActions);

  return { actions: eventiqActions, reducer, listener, ...hooks };
}

export type EventiqType<TExecutableConfigurationName extends string, TEventName extends string> = ReturnType<
  typeof createEventiq<TExecutableConfigurationName, TEventName>
>;
