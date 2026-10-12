import { createSlice } from '@reduxjs/toolkit';

export const TOKEN_KEY = 'padel93.auth.token';
export const USER_KEY = 'padel93.auth.user';
export const PERMISSIONS_KEY = 'padel93.auth.permissions';

function readJson(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistAuth({ token, user, permissions }) {
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions ?? {}));
}

function clearAuthStorage() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(PERMISSIONS_KEY);
}

const initialState = {
  token: readToken(),
  user: readJson(USER_KEY),
  permissions: readJson(PERMISSIONS_KEY) ?? {},
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authSet(state, action) {
      const { token, user, permissions } = action.payload;
      state.token = token;
      state.user = user;
      state.permissions = permissions ?? {};
      state.initialized = true;
      persistAuth(action.payload);
    },
    authUserUpdated(state, action) {
      state.user = action.payload;
      sessionStorage.setItem(USER_KEY, JSON.stringify(action.payload));
    },
    authPermissionsUpdated(state, action) {
      state.permissions = action.payload ?? {};
      sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(state.permissions));
    },
    authTokenReplaced(state, action) {
      state.token = action.payload;
      sessionStorage.setItem(TOKEN_KEY, action.payload);
    },
    authInitialized(state) {
      state.initialized = true;
    },
    authLoggedOut(state) {
      state.token = null;
      state.user = null;
      state.permissions = {};
      state.initialized = true;
      clearAuthStorage();
    },
  },
});

export const {
  authSet,
  authUserUpdated,
  authPermissionsUpdated,
  authTokenReplaced,
  authInitialized,
  authLoggedOut,
} = authSlice.actions;

export default authSlice.reducer;
