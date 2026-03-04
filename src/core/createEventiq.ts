import { createEventiqActions } from './actions.ts';
import { createEventiqSchedulingActions } from './actions.ts';
import { createEventiqReducer } from './reducer.ts';
import { createEventiqListenerMiddleware } from './middleware.ts';
import { createEventiqHooks } from '../hooks/createEventiqHooks.ts';
import { EventiqActions } from '../types/event.ts';

export function createEventiq<TExecutableConfigurationName extends string, TEventName extends string>() {
  const actions: EventiqActions<TExecutableConfigurationName, TEventName> = createEventiqActions();
  const eventiqSchedulingActions = createEventiqSchedulingActions<TEventName>();
  const reducer = createEventiqReducer(actions, eventiqSchedulingActions);
  const listener = createEventiqListenerMiddleware(actions, eventiqSchedulingActions);
  const hooks = createEventiqHooks(listener, eventiqSchedulingActions);

  return { actions, reducer, listener, ...hooks };
}

export type EventiqType<TExecutableConfigurationName extends string, TEventName extends string> = ReturnType<
  typeof createEventiq<TExecutableConfigurationName, TEventName>
>;
