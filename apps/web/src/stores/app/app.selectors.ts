import type { AppState } from "./app.types";

export const selectIsAppReady = (state: AppState) => state.isReady;
