import { type InitStoreOptions, initStore } from '../vanilla.ts';
import { useStoreState } from './use-store.ts';

/**
 * Creates a single store with a bound React hook.
 *
 * @param initialState - The initial state of the store
 * @param options - Optional lifecycle hooks
 *
 * @returns A function that acts as both:
 * - A React hook for subscribing to the store
 * - The store API (getState, setState, subscribe, etc.)
 *
 * @remarks
 * - Combines the vanilla store with React integration.
 * - The returned function can be used directly as a hook.
 *
 * @example
 * const useCounter = createStore({ count: 0 });
 *
 * function Component() {
 *   const count = useCounter((s) => s.count);
 * }
 *
 * useCounter.setState({ count: 1 });
 */
export const createStore = <TState extends Record<string, any>>(
  initialState: TState,
  options?: InitStoreOptions<TState>,
) => {
  const store = initStore(initialState, options);
  const useStore = <TStateSlice = TState>(selector?: (state: TState) => TStateSlice) =>
    useStoreState(store, selector);

  return Object.assign(useStore, store);
};
