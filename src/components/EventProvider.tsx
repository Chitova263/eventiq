import { createContext, useContext, type ReactNode } from 'react';
import { useEventiq } from '../hooks/useEventiq';

type EventiqContext = ReturnType<typeof useEventiq>;

const EventiqContext = createContext<EventiqContext | null>(null);

interface EventProviderProps {
  children: ReactNode;
  maxListeners?: number;
}

export function EventProvider({ children, maxListeners }: EventProviderProps) {
  const eventiq = useEventiq({ maxListeners });
  return (
    <EventiqContext.Provider value={eventiq}>
      {children}
    </EventiqContext.Provider>
  );
}

export function useEventiqContext(): EventiqContext {
  const context = useContext(EventiqContext);
  if (!context) {
    throw new Error('useEventiqContext must be used within an <EventProvider>');
  }
  return context;
}
