import { getValue, isClient, noop } from "./basic.ts";

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
 * @param changedKeys - The top-level keys that changed (shallow diff)
 *
 * @remarks
 * - Subscribers are only called when at least one field changes.
 * - Change detection is performed per key using `Object.is`.
 * - `changedKeys` only includes top-level keys; nested changes must be inferred by the consumer.
 */
export type Subscriber<TState> = (
  state: TState,
  prevState: TState,
  changedKeys: Array<keyof TState>,
) => void;

/**
 * Core store API for managing state.
 *
 * @remarks
 * - The store performs **shallow change detection per key** before notifying subscribers.
 * - Subscribers are only notified when at least one field changes.
 * - State is treated as **immutable**. Mutating nested values directly will not trigger updates.
 * - Designed to be framework-agnostic (React bindings are built separately).
 * - By default, `setState` is **disabled on the server** to prevent accidental shared state between requests.
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
export type InitStoreOptions<
  TState extends Record<string, any>,
  TStoreProps extends Record<string, any> = object,
> = {
  onFirstSubscribe?: (state: TState, store: StoreApi<TState> & TStoreProps) => void;
  onSubscribe?: (state: TState, store: StoreApi<TState> & TStoreProps) => void;
  onUnsubscribe?: (state: TState, store: StoreApi<TState> & TStoreProps) => void;
  onLastUnsubscribe?: (state: TState, store: StoreApi<TState> & TStoreProps) => void;

  /**
   * Called whenever the state changes, without counting as a subscriber.
   * Acts like a "spy" on state updates.
   * Useful for devtools, logging, or debugging state changes.
   */
  onStateChange?: (state: TState, prevState: TState, changedKeys: Array<keyof TState>) => void;

  /**
   * By default, calling `setState` on the server is disallowed to prevent shared state across requests.
   * Set this to `true` only if you explicitly intend to mutate state during server execution.
   */
  allowSetStateServerSide?: boolean;
};

/**
 * Creates a vanilla store with pub-sub capabilities.
 *
 * The store state must be an **object**.\
 * Updates are applied as shallow merges, so non-object states are not supported.
 *
 * @param initialState - The initial state of the store
 * @param options - Optional lifecycle hooks
 *
 * @returns A store API for managing state and subscriptions
 *
 * @remarks
 * - State updates are **shallowly compared per key** before notifying subscribers.
 * - Subscribers are only notified when at least one updated field changes (using `Object.is` comparison).
 * - Subscribers receive the new state, previous state, and changed top-level keys.
 * - State is expected to be treated as **immutable**.
 *   - Mutating nested values directly will not trigger updates.
 * - Lifecycle hooks allow side-effect management tied to subscription count.
 * - By default, `setState` is **not allowed on the server** to prevent accidental shared state between requests.
 *   - This helps avoid leaking data between users in server environments.
 *   - If you intentionally want to allow this behavior, set `allowSetStateServerSide: true`.
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
    onStateChange = noop,
    allowSetStateServerSide = false,
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
    if (!isClient && !allowSetStateServerSide) {
      console.error(
        "setState on the server is not allowed by default. Set `allowSetStateServerSide: true` to allow it.",
      );
      return;
    }

    const prevState = state;
    const newValue = getValue(value, state);
    const changedKeys: Array<keyof TState> = [];

    for (const key in newValue) {
      if (!Object.is(prevState[key], newValue[key])) {
        changedKeys.push(key);
      }
    }
    if (changedKeys.length === 0) return;

    state = { ...prevState, ...newValue };

    onStateChange(state, prevState, changedKeys);
    [...subscribers].forEach((subscriber) => subscriber(state, prevState, changedKeys));
  };

  const storeApi = {
    getState,
    setState,
    subscribe,
    getSubscribers,
  };
  return storeApi;
};
