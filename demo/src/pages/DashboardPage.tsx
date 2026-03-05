import { useDispatch, useSelector } from 'react-redux';
import type { ExecutionPlan, ExecutableEvent, ExecutionStatus } from '../../../src/index.ts';
import type { RootState } from '../store.ts';
import type { DashboardEventName, DemoPlanName } from '../types.ts';
import { eventiq } from '../store.ts';

const dashboardPlan: ExecutionPlan<DemoPlanName, DashboardEventName> = {
  name: 'dashboard-builder',
  events: [
    { name: 'load-layout', needs: [] },
    { name: 'fetch-theme', needs: [] },
    { name: 'apply-theme', needs: ['fetch-theme'] },
    { name: 'fetch-user-data', needs: ['load-layout'] },
    { name: 'fetch-sales-data', needs: ['load-layout'] },
    { name: 'fetch-activity', needs: ['load-layout'] },
    { name: 'render-charts', needs: ['fetch-sales-data', 'apply-theme'] },
    { name: 'dashboard-ready', needs: ['render-charts', 'fetch-user-data', 'fetch-activity'] },
  ],
};

// --- Helpers ---

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

function countByStatus(events: ExecutableEvent<string>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.status] = (counts[event.status] || 0) + 1;
  }
  return counts;
}

const STATUS_ORDER: ExecutionStatus[] = ['READY', 'RUNNING', 'COMPLETE', 'BLOCKED'];

function useEventStatus(name: DashboardEventName): ExecutionStatus | null {
  return useSelector((state: RootState) => {
    for (const plan of state.eventiq.queue) {
      if (plan.name !== 'dashboard-builder') continue;
      const event = plan.events.find((e) => e.name === name);
      if (event) return event.status;
    }
    return null;
  });
}

function isAtLeast(status: ExecutionStatus | null, target: ExecutionStatus): boolean {
  if (!status) return false;
  const order: ExecutionStatus[] = ['IDLE', 'BLOCKED', 'READY', 'RUNNING', 'COMPLETE'];
  return order.indexOf(status) >= order.indexOf(target);
}

// --- Dashboard widgets ---

function SkeletonBar({ width = '100%' }: { width?: string }) {
  return <div className="skeleton-bar" style={{ width }} />;
}

function UserCard() {
  const status = useEventStatus('fetch-user-data');
  const isLoading = status === 'RUNNING';
  const isLoaded = status === 'COMPLETE';

  return (
    <div className="widget widget-user">
      <div className="widget-header">Profile</div>
      {!isAtLeast(status, 'RUNNING') && <div className="widget-placeholder">Waiting for layout...</div>}
      {isLoading && (
        <div className="widget-body">
          <div className="user-avatar skeleton-circle" />
          <SkeletonBar width="60%" />
          <SkeletonBar width="40%" />
        </div>
      )}
      {isLoaded && (
        <div className="widget-body">
          <div className="user-avatar user-avatar-loaded">JD</div>
          <div className="user-name">Jane Doe</div>
          <div className="user-role">Admin</div>
          <div className="user-stats">
            <div className="user-stat">
              <span className="user-stat-value">142</span>
              <span className="user-stat-label">Projects</span>
            </div>
            <div className="user-stat">
              <span className="user-stat-value">98%</span>
              <span className="user-stat-label">Uptime</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesChart() {
  const fetchStatus = useEventStatus('fetch-sales-data');
  const renderStatus = useEventStatus('render-charts');
  const isFetching = fetchStatus === 'RUNNING';
  const isRendering = renderStatus === 'RUNNING';
  const isRendered = renderStatus === 'COMPLETE';
  const bars = [35, 58, 42, 70, 55, 80, 65, 90, 48, 72, 60, 85];

  return (
    <div className="widget widget-chart">
      <div className="widget-header">Monthly Revenue</div>
      {!isAtLeast(fetchStatus, 'RUNNING') && <div className="widget-placeholder">Waiting for layout...</div>}
      {isFetching && (
        <div className="widget-body">
          <SkeletonBar width="100%" />
          <SkeletonBar width="100%" />
          <SkeletonBar width="80%" />
        </div>
      )}
      {(isRendering || isRendered) && (
        <div className="widget-body">
          <div className="chart-bars">
            {bars.map((height, i) => (
              <div
                key={i}
                className={`chart-bar ${isRendered ? 'chart-bar-loaded' : 'chart-bar-rendering'}`}
                style={{ height: `${height}%`, animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
          <div className="chart-labels">
            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      )}
      {fetchStatus === 'COMPLETE' && !isAtLeast(renderStatus, 'RUNNING') && (
        <div className="widget-body">
          <div className="widget-waiting">Waiting for theme...</div>
        </div>
      )}
    </div>
  );
}

function ActivityFeed() {
  const status = useEventStatus('fetch-activity');
  const isLoading = status === 'RUNNING';
  const isLoaded = status === 'COMPLETE';
  const activities = [
    { user: 'Alice', action: 'deployed v2.4.1', time: '2m ago' },
    { user: 'Bob', action: 'merged PR #347', time: '5m ago' },
    { user: 'Carol', action: 'opened issue #89', time: '12m ago' },
    { user: 'Dave', action: 'pushed to main', time: '18m ago' },
  ];

  return (
    <div className="widget widget-activity">
      <div className="widget-header">Activity</div>
      {!isAtLeast(status, 'RUNNING') && <div className="widget-placeholder">Waiting for layout...</div>}
      {isLoading && (
        <div className="widget-body">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="activity-item-skeleton">
              <div className="skeleton-circle-sm" />
              <SkeletonBar width="70%" />
            </div>
          ))}
        </div>
      )}
      {isLoaded && (
        <div className="widget-body">
          {activities.map((a) => (
            <div key={a.time} className="activity-item">
              <div className="activity-dot" />
              <div className="activity-text">
                <span className="activity-user">{a.user}</span> {a.action}
              </div>
              <span className="activity-time">{a.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeIndicator() {
  const fetchStatus = useEventStatus('fetch-theme');
  const applyStatus = useEventStatus('apply-theme');

  return (
    <div className="widget widget-theme">
      <div className="widget-header">Theme</div>
      <div className="widget-body">
        {!isAtLeast(fetchStatus, 'RUNNING') && <div className="theme-status">idle</div>}
        {fetchStatus === 'RUNNING' && <div className="theme-status theme-loading">fetching palette...</div>}
        {fetchStatus === 'COMPLETE' && applyStatus !== 'COMPLETE' && (
          <div className="theme-status theme-applying">applying...</div>
        )}
        {applyStatus === 'COMPLETE' && (
          <div className="theme-colors">
            <div className="theme-swatch" style={{ background: '#646cff' }} />
            <div className="theme-swatch" style={{ background: '#3fb950' }} />
            <div className="theme-swatch" style={{ background: '#d29922' }} />
            <div className="theme-swatch" style={{ background: '#f85149' }} />
            <span className="theme-status theme-applied">applied</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPreview() {
  const layoutStatus = useEventStatus('load-layout');
  const readyStatus = useEventStatus('dashboard-ready');
  const started = isAtLeast(layoutStatus, 'RUNNING');

  return (
    <div className={`dashboard-preview ${readyStatus === 'COMPLETE' ? 'dashboard-ready' : ''}`}>
      <div className="dashboard-title-bar">
        <span className="dashboard-title">Dashboard Preview</span>
        {readyStatus === 'COMPLETE' && <span className="dashboard-badge-ready">LIVE</span>}
      </div>
      {!started ? (
        <div className="dashboard-empty">
          <p>Click "Build Dashboard" to start the pipeline</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          <UserCard />
          <SalesChart />
          <ActivityFeed />
          <ThemeIndicator />
        </div>
      )}
    </div>
  );
}

// --- Event card ---

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
            {event.outcome && <span className="badge badge-outcome">{event.outcome}</span>}
            {duration && <span className="badge badge-duration">{duration}</span>}
          </div>
        </div>
        <div className="event-row-bottom">
          <div className="event-deps-row">
            {event.needs.length > 0 && (
              <div className="event-deps">
                <span className="event-deps-label">needs</span>
                {event.needs.map((n) => (
                  <span key={n.name} className="dep-tag">
                    {n.name}
                  </span>
                ))}
              </div>
            )}
            {event.dependants.length > 0 && (
              <div className="event-deps">
                <span className="event-deps-label">unlocks</span>
                {event.dependants.map((d) => (
                  <span key={d.name} className="dep-tag">
                    {d.name}
                  </span>
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

// --- Page ---

export default function DashboardPage() {
  const dispatch = useDispatch();
  const planEvents = useSelector((state: RootState) =>
    state.eventiq.queue.filter((p) => p.name === 'dashboard-builder').flatMap((p) => p.events),
  );
  const statusCounts = countByStatus(planEvents);

  eventiq.useEventStarted('load-layout', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'load-layout' })), 800);
  });
  eventiq.useEventStarted('fetch-theme', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-theme' })), 1200);
  });
  eventiq.useEventStarted('apply-theme', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'apply-theme' })), 600);
  });
  eventiq.useEventStarted('fetch-user-data', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-user-data' })), 1500);
  });
  eventiq.useEventStarted('fetch-sales-data', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-sales-data' })), 2000);
  });
  eventiq.useEventStarted('fetch-activity', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'fetch-activity' })), 1800);
  });
  eventiq.useEventStarted('render-charts', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'render-charts' })), 1000);
  });
  eventiq.useEventStarted('dashboard-ready', () => {
    setTimeout(() => dispatch(eventiq.actions.eventSucceeded({ name: 'dashboard-ready' })), 300);
  });

  return (
    <div className="page-content">
      <div className="main-columns">
        <div className="col-preview">
          <DashboardPreview />
        </div>
        <div className="col-pipeline">
          <div className="pipeline-header">
            <span className="pipeline-title">Pipeline</span>
            <button className="btn btn-primary" onClick={() => dispatch(eventiq.actions.planSubmitted(dashboardPlan))}>
              Build Dashboard
            </button>
          </div>
          {planEvents.length > 0 && (
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
          {planEvents.length === 0 ? (
            <div className="empty-state">
              <p>No events queued yet.</p>
            </div>
          ) : (
            <div className="event-list">
              {planEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
