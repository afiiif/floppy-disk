const noop = () => {};

export type StoreData = Record<string, any>;
export type SetStoreData<T> = Partial<T> | ((prevState: T) => Partial<T>);
export type SelectDeps<T> = ((state: T) => any[]) | undefined;
export type Subscribers<T> = Map<(state: T) => void, SelectDeps<T>>;

export type StoreInitializer<T> = (api: {
  set: (value: SetStoreData<T>, silent?: boolean) => void;
  get: () => T;
  getSubscribers: () => Subscribers<T>;
}) => T;

export type StoreEvent<T> = (state: T, subscribers: Subscribers<T>) => void;

export type InitStoreOptions<T> = {
  intercept?: (nextState: T, prevState: T) => Partial<T>;
  onFirstSubscribe?: StoreEvent<T>;
  onSubscribe?: StoreEvent<T>;
  onUnsubscribe?: StoreEvent<T>;
  onLastUnsubscribe?: StoreEvent<T>;
};

export type InitStoreReturn<T> = {
  getSubscribers: () => Subscribers<T>;
  subscribe: (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getData: () => T;
  setData: (value: SetStoreData<T>, silent?: boolean) => void;
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

  let data: T;
  let keys: (keyof T)[];

  const subscribers = new Map<(state: T) => void, SelectDeps<T>>();

  const getSubscribers = () => subscribers;

  const subscribe = (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => {
    subscribers.set(fn, selectDeps);
    if (subscribers.size === 1) onFirstSubscribe(data, subscribers);
    onSubscribe(data, subscribers);
    return () => {
      subscribers.delete(fn);
      onUnsubscribe(data, subscribers);
      if (subscribers.size === 0) onLastUnsubscribe(data, subscribers);
    };
  };

  const getData = () => data;

  const setData = (value: SetStoreData<T>, silent = false) => {
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

  data = initializer({ set: setData, get: getData, getSubscribers });
  keys = Object.keys(data);

  return { getSubscribers, subscribe, getData, setData };
};
