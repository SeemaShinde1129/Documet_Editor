import type { AuthState, AuthUser } from "./auth.types";

export function setAuthSession(
  state: AuthState,
  user: AuthUser,
  accessToken: string,
): AuthState {
  return {
    ...state,
    user,
    accessToken,
  };
}

export function clearAuthSession(state: AuthState): AuthState {
  return {
    ...state,
    user: null,
    accessToken: null,
  };
}
