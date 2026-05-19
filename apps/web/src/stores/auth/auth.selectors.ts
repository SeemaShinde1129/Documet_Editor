import type { AuthState } from "./auth.types";

export const selectCurrentUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) =>
  Boolean(state.accessToken);
