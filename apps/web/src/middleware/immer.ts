export function updateState<TState>(
  state: TState,
  updater: (draft: TState) => TState,
) {
  return updater(state);
}
