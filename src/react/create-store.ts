import { type InitStoreOptions, initStore } from '../vanilla.ts';
import { useStoreState } from './use-store.ts';

export const createStore = <TState extends Record<string, any>>(
  initialState: TState,
  options?: InitStoreOptions<TState>,
) => {
  const store = initStore(initialState, options);
  const useStore = <TStateSlice = TState>(selector?: (state: TState) => TStateSlice) =>
    useStoreState(store, selector);

  return Object.assign(useStore, store);
};
