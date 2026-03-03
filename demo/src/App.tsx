import { useDispatch, useSelector } from 'react-redux';
import { eventConfigEnqueued, useWhenEventStarted } from '../../src/index.ts';
import type { EventConfig, ExecutableEvent, ExecutableEventStatus } from '../../src/index.ts';
import type { RootState } from './store.ts';
import './App.css';
import { eventSucceeded } from '../../src/eventiqActions.ts';

const exampleConfig: EventConfig<'user-signup', string> = {
  name: 'user-signup',
  events: [
    { name: 'bootstrap', needs: [] },
    { name: 'config', needs: ['bootstrap'] },
    { name: 'settings', needs: ['bootstrap'] },
    { name: 'validate-input', needs: [] },
    { name: 'create-user', needs: ['validate-input'] },
    { name: 'send-email', needs: ['create-user'] },
    { name: 'log-analytics', needs: ['create-user'] },
    { name: 'redirect', needs: ['send-email', 'log-analytics'] },
  ],
};

function formatTime(ts: number | null): string {
  if (!ts) return '--:--:--';
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function getDuration(start: number | null, end: number | null): string | null {
  if (!start || !end) return null;
  const ms = end - start;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function countByStatus(queue: ExecutableEvent<string>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of queue) {
    counts[event.status] = (counts[event.status] || 0) + 1;
  }
  return counts;
}

const STATUS_ORDER: ExecutableEventStatus[] = ['READY', 'RUNNING', 'COMPLETE', 'FAILED', 'SKIPPED', 'BLOCKED'];

function EventCard({ event }: { event: ExecutableEvent<string> }) {
  const duration = getDuration(event.startTime, event.endTime);

  return (
    <div className="event-card" data-status={event.status}>
      <div className="event-indicator" />
      <div className="event-content">
        <div className="event-row-top">
          <span className="event-name">{event.name}</span>
          <div className="event-badges">
            <span className="badge badge-status" data-status={event.status}>
              {event.status}
            </span>
            {event.outcome && (
              <span className="badge badge-outcome">{event.outcome}</span>
            )}
            {duration && (
              <span className="badge badge-duration">{duration}</span>
            )}
          </div>
        </div>
        <div className="event-row-bottom">
          <div className="event-deps-row">
            {event.needs.length > 0 && (
              <div className="event-deps">
                <span className="event-deps-label">needs</span>
                {event.needs.map((n) => (
                  <span key={n.name} className="dep-tag">{n.name}</span>
                ))}
              </div>
            )}
            {event.dependants.length > 0 && (
              <div className="event-deps">
                <span className="event-deps-label">unlocks</span>
                {event.dependants.map((d) => (
                  <span key={d.name} className="dep-tag">{d.name}</span>
                ))}
              </div>
            )}
          </div>
          <div className="event-timestamps">
            <span>{formatTime(event.startTime)}</span>
            <span>{formatTime(event.endTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const dispatch = useDispatch();
  const eventQueue = useSelector((state: RootState) => state.eventiq.queue);
  const statusCounts = countByStatus(eventQueue);

  useWhenEventStarted<string>('bootstrap', async () => {
    new Promise<void>((resolve) => {
      setTimeout(() => {
        dispatch(eventSucceeded({ event: 'bootstrap' }));
        resolve();
      }, 5000);
    });
  });

  return (
    <div>
      <div className="header">
        <div className="header-left">
          <h1><span>eventiq</span> demo</h1>
          <div className="header-sub">user-signup workflow</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => dispatch(eventConfigEnqueued(exampleConfig))}
        >
          Run Pipeline
        </button>
      </div>

      {eventQueue.length > 0 && (
        <div className="stats-bar">
          {STATUS_ORDER.filter((s) => statusCounts[s]).map((status) => (
            <div key={status} className="stat">
              <div className="stat-dot" data-status={status} />
              <span className="stat-count">{statusCounts[status]}</span>
              <span>{status.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}

      {eventQueue.length === 0 ? (
        <div className="empty-state">
          <p>No events queued. Click "Run Pipeline" to start.</p>
        </div>
      ) : (
        <div className="event-list">
          {eventQueue.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
