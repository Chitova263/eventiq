import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store.ts';
import { actionLog } from '../store.ts';

type Tab = 'events' | 'api' | 'actions';

function EventsTab() {
  const queue = useSelector((state: RootState) => state.eventiq.queue);

  if (queue.length === 0) {
    return <div className="viz-empty">No execution plans in the store yet.</div>;
  }

  return (
    <div className="viz-scroll">
      {queue.map((plan, planIdx) => (
        <div key={planIdx} className="viz-plan">
          <div className="viz-plan-name">{plan.name}</div>
          <table className="viz-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Outcome</th>
                <th>Needs</th>
                <th>Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {plan.events.map((event) => (
                <tr key={event.id} data-status={event.status}>
                  <td className="viz-mono">{event.name}</td>
                  <td>
                    <span className="viz-status-dot" data-status={event.status} />
                    {event.status}
                  </td>
                  <td className="viz-dim">{event.outcome ?? '—'}</td>
                  <td className="viz-dim viz-mono">
                    {event.needs.length > 0 ? event.needs.map((n) => n.name).join(', ') : '—'}
                  </td>
                  <td className="viz-dim viz-mono">
                    {event.dependants.length > 0 ? event.dependants.map((d) => d.name).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ApiTab() {
  const apiState = useSelector((state: RootState) => state.api);
  const entries = Object.entries(apiState);
  const hasData = entries.some(([, v]) => v !== null);

  if (!hasData) {
    return <div className="viz-empty">No API data loaded yet.</div>;
  }

  return (
    <div className="viz-scroll">
      <div className="viz-api-grid">
        {entries.map(([key, value]) => (
          <div key={key} className={`viz-api-entry ${value ? 'viz-api-loaded' : ''}`}>
            <div className="viz-api-key">
              <span className="viz-api-dot" data-loaded={!!value} />
              {key}
            </div>
            <pre className="viz-api-json">{value ? JSON.stringify(value, null, 2) : 'null'}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsTab() {
  // Re-read actionLog on every render (triggered by store updates)
  const entries = actionLog.slice().reverse();

  if (entries.length === 0) {
    return <div className="viz-empty">No actions dispatched yet.</div>;
  }

  return (
    <div className="viz-scroll">
      <div className="viz-actions-list">
        {entries.map((entry, i) => (
          <div key={i} className="viz-action-row">
            <span className="viz-action-time">
              {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3,
              })}
            </span>
            <span className="viz-action-type">{entry.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoreVisualizer() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('events');

  // Force re-render when store changes (for action log)
  useSelector((state: RootState) => state.eventiq.queue.length + (state.api.user ? 1 : 0));

  return (
    <div className={`visualizer ${isOpen ? 'visualizer-open' : ''}`}>
      <button className="visualizer-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span className="visualizer-toggle-label">Store Inspector</span>
        <span className="visualizer-toggle-arrow">{isOpen ? '▼' : '▲'}</span>
      </button>
      {isOpen && (
        <div className="visualizer-body">
          <div className="visualizer-tabs">
            <button className={`viz-tab ${tab === 'events' ? 'viz-tab-active' : ''}`} onClick={() => setTab('events')}>
              Events
            </button>
            <button className={`viz-tab ${tab === 'api' ? 'viz-tab-active' : ''}`} onClick={() => setTab('api')}>
              API Data
            </button>
            <button
              className={`viz-tab ${tab === 'actions' ? 'viz-tab-active' : ''}`}
              onClick={() => setTab('actions')}
            >
              Action Log
              <span className="viz-tab-count">{actionLog.length}</span>
            </button>
          </div>
          <div className="visualizer-content">
            {tab === 'events' && <EventsTab />}
            {tab === 'api' && <ApiTab />}
            {tab === 'actions' && <ActionsTab />}
          </div>
        </div>
      )}
    </div>
  );
}
