import { createEventiqActions } from './actions.ts';
import { createEventiqSchedularActions } from './actions.ts';
import { createEventiqReducer } from './reducer.ts';
import { createEventiqListenerMiddleware } from './middleware.ts';
import { createEventiqHooks } from '../hooks/createEventiqHooks.ts';
import { EventiqActions, EventiqEventSchedularActions, EventiqStore } from '../types/planEvent.ts';
import { createEventiqSelectors } from './selector.ts';

export function createEventiq<TPlanName extends string, TEventName extends string>() {
  const eventiqActions: EventiqActions<TPlanName, TEventName> = createEventiqActions();
  const eventiqEventSchedularActions: EventiqEventSchedularActions<TEventName> =
    createEventiqSchedularActions<TEventName>();
  const reducer = createEventiqReducer(eventiqActions, eventiqEventSchedularActions);
  const selectors = createEventiqSelectors((rootState: EventiqStore<TPlanName, TEventName>) => rootState.eventiq);
  const listener = createEventiqListenerMiddleware(eventiqActions, eventiqEventSchedularActions, selectors);
  const hooks = createEventiqHooks(listener, eventiqEventSchedularActions);

  return { actions: eventiqActions, reducer, listener, selectors, ...hooks };
}

export type EventiqType<TPlanName extends string, TEventName extends string> = ReturnType<
  typeof createEventiq<TPlanName, TEventName>
>;
