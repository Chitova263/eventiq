export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  orgId: string;
  settingsId: string;
  notificationToken: string;
};

export type Preferences = {
  theme: 'dark' | 'light';
  language: string;
  timezone: string;
  emailDigest: boolean;
};

export type Team = {
  id: string;
  name: string;
  members: number;
  role: string;
};

export type Notification = {
  id: number;
  text: string;
  read: boolean;
  time: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUser(): Promise<User> {
  await delay(1200);
  return {
    id: 'usr_123',
    name: 'Jane Doe',
    email: 'jane@acme.co',
    avatar: 'JD',
    orgId: 'org_456',
    settingsId: 'pref_789',
    notificationToken: 'ntf_abc',
  };
}

export async function fetchPreferences(settingsId: string): Promise<Preferences> {
  await delay(800);
  console.log(`[mock] GET /preferences/${settingsId}`);
  return {
    theme: 'dark',
    language: 'English',
    timezone: 'UTC-5 (Eastern)',
    emailDigest: true,
  };
}

export async function fetchTeams(orgId: string): Promise<Team[]> {
  await delay(1000);
  console.log(`[mock] GET /orgs/${orgId}/teams`);
  return [
    { id: 'team_1', name: 'Engineering', members: 12, role: 'Lead' },
    { id: 'team_2', name: 'Platform', members: 8, role: 'Member' },
    { id: 'team_3', name: 'Security', members: 5, role: 'Reviewer' },
  ];
}

export async function fetchPermissions(userId: string, teamIds: string[]): Promise<string[]> {
  await delay(600);
  console.log(`[mock] POST /permissions { user: ${userId}, teams: [${teamIds.join(', ')}] }`);
  return ['admin', 'deploy:prod', 'deploy:staging', 'review:pr', 'manage:team', 'view:billing'];
}

export async function fetchNotifications(token: string): Promise<Notification[]> {
  await delay(1400);
  console.log(`[mock] GET /notifications?token=${token}`);
  return [
    { id: 1, text: 'PR #347 approved', read: false, time: '2m ago' },
    { id: 2, text: 'Deploy to staging complete', read: false, time: '15m ago' },
    { id: 3, text: 'New team member: Bob', read: true, time: '1h ago' },
    { id: 4, text: 'Security scan passed', read: true, time: '3h ago' },
  ];
}
