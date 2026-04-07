import { type InitStoreOptions, initStore } from "../vanilla.ts";
import { useStoreState } from "./use-store.ts";

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
 *   - The hook uses Proxy-based tracking to automatically detect which state fields are used.
 *   - Components will only re-render when the accessed values change.
 *
 * @example
 * const useMyStore = createStore({ foo: 1, bar: 2 });
 *
 * function Component() {
 *   const state = useMyStore();
 *   return <div>{state.foo}</div>;
 * }
 *
 * useMyStore.setState({ foo: 2 }); // only components using foo will re-render
 *
 * @see https://floppy-disk.vercel.app/docs/store
 */
export const createStore = <TState extends Record<string, any>>(
  initialState: TState,
  options?: InitStoreOptions<TState>,
) => {
  const store = initStore(initialState, options);
  const useStore = (options?: {
    /**
     * Initial state used on first render (and will also update the store state right after that)
     */
    initialState?: Partial<TState>;
  }) => useStoreState(store, options);
  return Object.assign(useStore, store);
};
