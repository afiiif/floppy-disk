import { noop } from './utils';

export type StoreData = Record<string, any>;
export type SetStoreData<T> = Partial<T> | ((prevState: T) => Partial<T>);
export type SelectDeps<T> = ((state: T) => any[]) | undefined;
export type Subscribers<T> = Map<(state: T) => void, SelectDeps<T>>;

export type StoreInitializer<T> = (api: {
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
}) => T;

export type StoreEvent<T> = (state: T) => void;

export type InitStoreOptions<T> = {
  intercept?: (nextState: T, prevState: T) => Partial<T>;
  onFirstSubscribe?: StoreEvent<T>;
  onSubscribe?: StoreEvent<T>;
  onUnsubscribe?: StoreEvent<T>;
  onLastUnsubscribe?: StoreEvent<T>;
};

export type InitStoreReturn<T> = {
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
  subscribe: (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getSubscribers: () => Subscribers<T>;
};

export const initStore = <T extends StoreData>(
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

  let data: T;
  let keys: (keyof T)[];

  const get = () => data;

  const set = (value: SetStoreData<T>, silent = false) => {
    const prevData = data;
    if (typeof value === 'function') {
      data = { ...data, ...value(data) };
    } else {
      data = { ...data, ...value };
    }

    if (intercept) {
      data = { ...data, ...intercept(data, prevData) };
    }

    if (silent) return;
    subscribers.forEach((selectDeps, fn) => {
      if (!selectDeps) {
        for (let i = 0, n = keys.length; i < n; i++) {
          if (prevData[keys[i]] !== data[keys[i]]) {
            fn(data);
            break;
          }
        }
        return;
      }
      const prevs = selectDeps(prevData);
      const nexts = selectDeps(data);
      for (let i = 0, n = prevs.length; i < n; i++) {
        if (prevs[i] !== nexts[i]) {
          fn(data);
          break;
        }
      }
    });
  };

  const subscribe = (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => {
    subscribers.set(fn, selectDeps);
    if (subscribers.size === 1) onFirstSubscribe(data);
    onSubscribe(data);
    return () => {
      subscribers.delete(fn);
      onUnsubscribe(data);
      if (subscribers.size === 0) onLastUnsubscribe(data);
    };
  };

  data = initializer({ get, set });
  keys = Object.keys(data);

  return { get, set, subscribe, getSubscribers };
};
