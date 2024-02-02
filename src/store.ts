import { getValue, Maybe, noop } from './utils';

export type StoreState = Record<string, any>;
export type SetStoreState<T> = Partial<T> | ((state: T) => Partial<T>);
export type SelectDeps<T> = ((state: T) => any[]) | undefined | null;
export type Subscribers<T> = Map<(state: T) => void, SelectDeps<T>>;

export type StoreInitializer<T> =
  | T
  | ((api: { get: () => T; set: (value: SetStoreState<T>, silent?: boolean) => void }) => T);

export type StoreEvent<T> = (state: T) => void;

export type InitStoreOptions<T> = {
  intercept?: (nextState: T, prevState: T) => void | Maybe<Partial<T>>;
  onFirstSubscribe?: StoreEvent<T>;
  onSubscribe?: StoreEvent<T>;
  onUnsubscribe?: StoreEvent<T>;
  onLastUnsubscribe?: StoreEvent<T>;
};

export type InitStoreReturn<T> = {
  get: () => T;
  set: (value: SetStoreState<T>, silent?: boolean) => void;
  subscribe: (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getSubscribers: () => Subscribers<T>;
};

export const initStore = <T extends StoreState>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> = {},
): InitStoreReturn<T> => {
  const {
    intercept,
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onUnsubscribe = noop,
    onLastUnsubscribe = noop,
  } = options;

  const subscribers = new Map<(state: T) => void, SelectDeps<T>>();

  const getSubscribers = () => subscribers;

  let state: T;

  const get = () => state;

  const set = (value: SetStoreState<T>, silent = false) => {
    const prevState = state;
    state = { ...state, ...getValue(value, state) };

    if (intercept) {
      state = { ...state, ...intercept(state, prevState) };
    }

    if (silent) return;

    const keys = Object.keys(state) as (keyof T)[];
    subscribers.forEach((selectDeps, fn) => {
      if (!selectDeps) {
        for (let i = 0, n = keys.length; i < n; i++) {
          if (prevState[keys[i]] !== state[keys[i]]) {
            fn(state);
            break;
          }
        }
        return;
      }
      const prevs = selectDeps(prevState);
      const nexts = selectDeps(state);
      for (let i = 0, n = prevs.length; i < n; i++) {
        if (prevs[i] !== nexts[i]) {
          fn(state);
          break;
        }
      }
    });
  };

  const subscribe = (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => {
    subscribers.set(fn, selectDeps);
    if (subscribers.size === 1) onFirstSubscribe(state);
    onSubscribe(state);
    return () => {
      subscribers.delete(fn);
      onUnsubscribe(state);
      if (subscribers.size === 0) onLastUnsubscribe(state);
    };
  };

  state = getValue(initializer, { get, set });

  return { get, set, subscribe, getSubscribers };
};
