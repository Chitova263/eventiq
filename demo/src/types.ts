export type ProfileEventName =
  | 'fetch-user'
  | 'fetch-preferences'
  | 'fetch-teams'
  | 'fetch-permissions'
  | 'fetch-notifications'
  | 'page-ready';

export type DemoEventName = ProfileEventName;
export type DemoPlanName = 'profile-loader';
