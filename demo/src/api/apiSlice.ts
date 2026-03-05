import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, Preferences, Team, Notification } from './mockApi.ts';

export interface ApiSliceState {
  user: User | null;
  preferences: Preferences | null;
  teams: Team[] | null;
  permissions: string[] | null;
  notifications: Notification[] | null;
}

const initialState: ApiSliceState = {
  user: null,
  preferences: null,
  teams: null,
  permissions: null,
  notifications: null,
};

export const apiSlice = createSlice({
  name: 'api',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    setPreferences(state, action: PayloadAction<Preferences>) {
      state.preferences = action.payload;
    },
    setTeams(state, action: PayloadAction<Team[]>) {
      state.teams = action.payload;
    },
    setPermissions(state, action: PayloadAction<string[]>) {
      state.permissions = action.payload;
    },
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.notifications = action.payload;
    },
    reset() {
      return initialState;
    },
  },
});

export const apiActions = apiSlice.actions;
