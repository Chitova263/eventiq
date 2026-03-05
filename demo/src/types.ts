export type DashboardEventName =
  | 'load-layout'
  | 'fetch-theme'
  | 'apply-theme'
  | 'fetch-user-data'
  | 'fetch-sales-data'
  | 'fetch-activity'
  | 'render-charts'
  | 'dashboard-ready';

export type ProfileEventName =
  | 'fetch-user'
  | 'fetch-preferences'
  | 'fetch-teams'
  | 'fetch-permissions'
  | 'fetch-notifications'
  | 'page-ready';

export type DemoEventName = DashboardEventName | ProfileEventName;
export type DemoPlanName = 'dashboard-builder' | 'profile-loader';
