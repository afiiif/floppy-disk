import { getValue, noop } from './basic.ts';

/**
 * Represents a partial state update.
 *
 * Can be either:
 * - A partial object to merge into the current state
 * - A function that receives the current state and returns a partial update
 */
export type SetState<TState> = Partial<TState> | ((state: TState) => Partial<TState>);

/**
 * A subscriber function that is called whenever the state updates.
 *
 * @param state - The latest state
 * @param prevState - The previous state before the update
 *
 * @remarks
 * - Subscribers are only called when the state actually changes.
 * - Change detection is performed per key using `Object.is`.
 */
export type Subscriber<TState> = (state: TState, prevState: TState) => void;

/**
 * Core store API for managing state.
 *
 * @remarks
 * - The store performs **shallow change detection per key** before notifying subscribers.
 * - Subscribers are only notified when at least one field changes.
 * - Designed to be framework-agnostic (React bindings are built separately).
 */
export type StoreApi<TState extends Record<string, any>> = {
  setState: (value: SetState<TState>) => void;
  getState: () => TState;
  subscribe: (subscriber: Subscriber<TState>) => () => void;
  getSubscribers: () => Set<Subscriber<TState>>;
};

/**
 * Lifecycle hooks for the store.
 *
 * These hooks allow you to attach side effects based on subscription lifecycle.
 *
 * @remarks
 * Useful for:
 * - Lazy initialization (e.g. start fetching on first subscribe)
 * - Cleanup (e.g. cancel timers, disconnect sockets)
 * - Resource management (e.g. garbage collection)
 */
export type InitStoreOptions<TState extends Record<string, any>> = {
  onFirstSubscribe?: (state: TState, store: StoreApi<TState>) => void;
  onSubscribe?: (state: TState, store: StoreApi<TState>) => void;
  onUnsubscribe?: (state: TState, store: StoreApi<TState>) => void;
  onLastUnsubscribe?: (state: TState, store: StoreApi<TState>) => void;
};

/**
 * Creates a vanilla store with pub-sub capabilities.
 *
 * The store state is expected to be an **object**.\
 * Updates are applied as partial merges, so non-object states are not supported.
 *
 * @param initialState - The initial state of the store
 * @param options - Optional lifecycle hooks
 *
 * @returns A store API for managing state and subscriptions
 *
 * @remarks
 * - State updates are **shallowly compared per key** before notifying subscribers.
 * - Subscribers are only notified when at least one updated field changes (using `Object.is` comparison).
 * - Subscribers receive both the new state and the previous state.
 * - Lifecycle hooks allow side-effect management tied to subscription count.
 *
 * @example
 * const store = initStore({ count: 0 });
 *
 * store.subscribe((state) => console.log(state.count));
 * store.setState({ count: 1 }); // triggers subscriber
 * store.setState({ count: 1 }); // no-op (no change)
 */
export const initStore = <TState extends Record<string, any>>(
  initialState: TState,
  options: InitStoreOptions<TState> = {},
): StoreApi<TState> => {
  const {
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onUnsubscribe = noop,
    onLastUnsubscribe = noop,
  } = options;

  const subscribers = new Set<Subscriber<TState>>();
  const getSubscribers = () => subscribers;
  const subscribe = (subscriber: Subscriber<TState>) => {
    subscribers.add(subscriber);
    if (subscribers.size === 1) onFirstSubscribe(state, storeApi);
    onSubscribe(state, storeApi);
    return () => {
      subscribers.delete(subscriber);
      onUnsubscribe(state, storeApi);
      if (subscribers.size === 0) onLastUnsubscribe(state, storeApi);
    };
  };

  let state = initialState;
  const getState = () => state;
  const setState = (value: SetState<TState>) => {
    const prevState = state;
    const newValue = getValue(value, state);
    for (const key in newValue) {
      if (!Object.is(prevState[key], newValue[key])) {
        state = { ...prevState, ...newValue };
        [...subscribers].forEach((subscriber) => subscriber(state, prevState));
        return;
      }
    }
  };

  const storeApi = {
    getState,
    setState,
    subscribe,
    getSubscribers,
  };
  return storeApi;
};
