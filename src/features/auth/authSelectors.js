export const selectAuth = (state) => state.auth;
export const selectToken = (state) => state.auth.token;
export const selectUser = (state) => state.auth.user;
export const selectPermissions = (state) => state.auth.permissions;
export const selectRole = (state) => state.auth.user?.role ?? null;

export const hasPermission = (state, key) => {
  if (state.auth.user?.role === 'OWNER') return true;
  return Boolean(state.auth.permissions?.[key]);
};
