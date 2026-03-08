import { useDispatch, useSelector } from 'react-redux';
import type { ExecutionPlan, ExecutableEvent, ExecutionStatus } from 'eventiq';
import type { RootState } from '../store.ts';
import type { ProfileEventName, DemoPlanName } from '../types.ts';
import { eventiq, store } from '../store.ts';
import { apiActions } from '../api/apiSlice.ts';
import * as api from '../api/mockApi.ts';

const profilePlan: ExecutionPlan<DemoPlanName, ProfileEventName> = {
  name: 'profile-loader',
  events: [
    { name: 'fetch-user', needs: [] },
    { name: 'fetch-preferences', needs: ['fetch-user'] },
    { name: 'fetch-teams', needs: ['fetch-user'] },
    { name: 'fetch-permissions', needs: ['fetch-user', 'fetch-teams'] },
    { name: 'fetch-notifications', needs: ['fetch-user'] },
    { name: 'page-ready', needs: ['fetch-preferences', 'fetch-permissions', 'fetch-notifications'] },
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

function useProfileEventStatus(name: ProfileEventName): ExecutionStatus | null {
  return useSelector((state: RootState) => {
    for (const plan of state.eventiq.queue) {
      if (plan.name !== 'profile-loader') continue;
      const event = plan.events.find((e) => e.name === name);
      if (event) return event.status;
    }
    return null;
  });
}

// --- Skeleton ---

function SkeletonBar({ width = '100%' }: { width?: string }) {
  return <div className="skeleton-bar" style={{ width }} />;
}

// --- Profile widgets ---

function ProfileHeader() {
  const status = useProfileEventStatus('fetch-user');
  const user = useSelector((state: RootState) => state.api.user);

  return (
    <div className="profile-header-card">
      {status === 'RUNNING' && (
        <div className="profile-header-loading">
          <div className="skeleton-circle" />
          <div className="profile-header-text-skeleton">
            <SkeletonBar width="200px" />
            <SkeletonBar width="150px" />
          </div>
        </div>
      )}
      {status === 'COMPLETE' && user && (
        <div className="profile-header-loaded">
          <div className="profile-avatar">{user.avatar}</div>
          <div className="profile-header-info">
            <div className="profile-name">{user.name}</div>
            <div className="profile-email">{user.email}</div>
            <div className="profile-id">ID: {user.id}</div>
          </div>
        </div>
      )}
      {!status || status === 'IDLE' || status === 'BLOCKED' || status === 'READY' ? (
        <div className="widget-placeholder">Waiting to fetch user...</div>
      ) : null}
    </div>
  );
}

function PreferencesWidget() {
  const status = useProfileEventStatus('fetch-preferences');
  const prefs = useSelector((state: RootState) => state.api.preferences);

  return (
    <div className="widget">
      <div className="widget-header">Preferences</div>
      {(!status || status === 'IDLE' || status === 'BLOCKED' || status === 'READY') && (
        <div className="widget-placeholder">Needs user.settingsId</div>
      )}
      {status === 'RUNNING' && (
        <div className="widget-body">
          <SkeletonBar width="80%" />
          <SkeletonBar width="60%" />
          <SkeletonBar width="70%" />
        </div>
      )}
      {status === 'COMPLETE' && prefs && (
        <div className="widget-body pref-list">
          <div className="pref-row">
            <span className="pref-label">Theme</span>
            <span className="pref-value">{prefs.theme}</span>
          </div>
          <div className="pref-row">
            <span className="pref-label">Language</span>
            <span className="pref-value">{prefs.language}</span>
          </div>
          <div className="pref-row">
            <span className="pref-label">Timezone</span>
            <span className="pref-value">{prefs.timezone}</span>
          </div>
          <div className="pref-row">
            <span className="pref-label">Email Digest</span>
            <span className="pref-value pref-toggle" data-on={prefs.emailDigest}>
              {prefs.emailDigest ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsWidget() {
  const status = useProfileEventStatus('fetch-teams');
  const teams = useSelector((state: RootState) => state.api.teams);

  return (
    <div className="widget">
      <div className="widget-header">Teams</div>
      {(!status || status === 'IDLE' || status === 'BLOCKED' || status === 'READY') && (
        <div className="widget-placeholder">Needs user.orgId</div>
      )}
      {status === 'RUNNING' && (
        <div className="widget-body">
          {[1, 2, 3].map((i) => (
            <div key={i} className="team-card-skeleton">
              <SkeletonBar width="50%" />
              <SkeletonBar width="30%" />
            </div>
          ))}
        </div>
      )}
      {status === 'COMPLETE' && teams && (
        <div className="widget-body">
          {teams.map((team) => (
            <div key={team.id} className="team-card">
              <div className="team-name">{team.name}</div>
              <div className="team-meta">
                <span className="team-members">{team.members} members</span>
                <span className="team-role-badge">{team.role}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PermissionsWidget() {
  const status = useProfileEventStatus('fetch-permissions');
  const permissions = useSelector((state: RootState) => state.api.permissions);

  return (
    <div className="widget">
      <div className="widget-header">Permissions</div>
      {(!status || status === 'IDLE' || status === 'BLOCKED' || status === 'READY') && (
        <div className="widget-placeholder">Needs userId + teamIds</div>
      )}
      {status === 'RUNNING' && (
        <div className="widget-body">
          <div className="perm-grid-skeleton">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-bar" style={{ width: '80px', height: '24px' }} />
            ))}
          </div>
        </div>
      )}
      {status === 'COMPLETE' && permissions && (
        <div className="widget-body">
          <div className="perm-grid">
            {permissions.map((perm) => (
              <span key={perm} className="perm-badge">
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsWidget() {
  const status = useProfileEventStatus('fetch-notifications');
  const notifications = useSelector((state: RootState) => state.api.notifications);

  return (
    <div className="widget widget-notifications">
      <div className="widget-header">
        Notifications
        {notifications && <span className="notif-count">{notifications.filter((n) => !n.read).length}</span>}
      </div>
      {(!status || status === 'IDLE' || status === 'BLOCKED' || status === 'READY') && (
        <div className="widget-placeholder">Needs user.notificationToken</div>
      )}
      {status === 'RUNNING' && (
        <div className="widget-body">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="activity-item-skeleton">
              <div className="skeleton-circle-sm" />
              <SkeletonBar width="70%" />
            </div>
          ))}
        </div>
      )}
      {status === 'COMPLETE' && notifications && (
        <div className="widget-body">
          {notifications.map((n) => (
            <div key={n.id} className={`notif-item ${n.read ? 'notif-read' : 'notif-unread'}`}>
              <div className={`notif-dot ${n.read ? '' : 'notif-dot-unread'}`} />
              <span className="notif-text">{n.text}</span>
              <span className="activity-time">{n.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePreview() {
  const userStatus = useProfileEventStatus('fetch-user');
  const readyStatus = useProfileEventStatus('page-ready');
  const started = userStatus && userStatus !== 'IDLE' && userStatus !== 'BLOCKED' && userStatus !== 'READY';

  return (
    <div className={`dashboard-preview ${readyStatus === 'COMPLETE' ? 'dashboard-ready' : ''}`}>
      <div className="dashboard-title-bar">
        <span className="dashboard-title">Profile Page</span>
        {readyStatus === 'COMPLETE' && <span className="dashboard-badge-ready">LOADED</span>}
      </div>
      {!started ? (
        <div className="dashboard-empty">
          <p>Click "Load Profile" to start the API pipeline</p>
        </div>
      ) : (
        <div className="profile-layout">
          <ProfileHeader />
          <div className="profile-grid">
            <PreferencesWidget />
            <TeamsWidget />
            <PermissionsWidget />
            <NotificationsWidget />
          </div>
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

export default function ProfilePage() {
  const dispatch = useDispatch();
  const planEvents = useSelector((state: RootState) =>
    state.eventiq.queue.filter((p) => p.name === 'profile-loader').flatMap((p) => p.events),
  );
  const statusCounts = countByStatus(planEvents);

  // Wire eventiq events to mock API calls.
  // Each handler reads dependent data from the store, calls the API,
  // stores the result in the api slice, then signals success to eventiq.

  eventiq.useEventStarted('fetch-user', async () => {
    const user = await api.fetchUser();
    dispatch(apiActions.setUser(user));
    dispatch(eventiq.actions.completed({ name: 'fetch-user', outcome: 'SUCCESS' }));
  });

  eventiq.useEventStarted('fetch-preferences', async () => {
    const { user } = store.getState().api;
    const prefs = await api.fetchPreferences(user!.settingsId);
    dispatch(apiActions.setPreferences(prefs));
    dispatch(eventiq.actions.completed({ name: 'fetch-preferences', outcome: 'SUCCESS' }));
  });

  eventiq.useEventStarted('fetch-teams', async () => {
    const { user } = store.getState().api;
    const teams = await api.fetchTeams(user!.orgId);
    dispatch(apiActions.setTeams(teams));
    dispatch(eventiq.actions.completed({ name: 'fetch-teams', outcome: 'SUCCESS' }));
  });

  eventiq.useEventStarted('fetch-permissions', async () => {
    const { user, teams } = store.getState().api;
    const perms = await api.fetchPermissions(
      user!.id,
      teams!.map((t) => t.id),
    );
    dispatch(apiActions.setPermissions(perms));
    dispatch(eventiq.actions.completed({ name: 'fetch-permissions', outcome: 'SUCCESS' }));
  });

  eventiq.useEventStarted('fetch-notifications', async () => {
    const { user } = store.getState().api;
    const notifs = await api.fetchNotifications(user!.notificationToken);
    dispatch(apiActions.setNotifications(notifs));
    dispatch(eventiq.actions.completed({ name: 'fetch-notifications', outcome: 'SUCCESS' }));
  });

  eventiq.useEventStarted('page-ready', () => {
    setTimeout(() => dispatch(eventiq.actions.completed({ name: 'page-ready', outcome: 'SUCCESS' })), 200);
  });

  return (
    <div className="page-content">
      <div className="main-columns">
        <div className="col-preview">
          <ProfilePreview />
        </div>
        <div className="col-pipeline">
          <div className="pipeline-header">
            <span className="pipeline-title">Pipeline</span>
            <button
              className="btn btn-primary"
              onClick={() => {
                dispatch(apiActions.reset());
                dispatch(eventiq.actions.planSubmitted(profilePlan));
              }}
            >
              Load Profile
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
