import { useEffect, useMemo, useRef, useState } from 'react';

import {
  initStore,
  InitStoreOptions,
  InitStoreReturn,
  SelectDeps,
  SetStoreState,
  StoreState,
  Subscribers,
} from '../store';
import { getValue, Maybe, noop } from '../utils';
import { WatchProps } from './create-store';

export type StoreKey = Record<string, any> | undefined;

export type StoresInitializer<
  TKey extends StoreKey = StoreKey,
  T extends StoreState = StoreState,
> =
  | T
  | ((api: {
      get: () => T;
      set: (value: SetStoreState<T>, silent?: boolean) => void;
      key: TKey;
      keyHash: string;
    }) => T);

export type UseStores<TKey extends StoreKey = StoreKey, T extends StoreState = StoreState> = {
  /**
   * @param key (Optional) Store key, an object that will be hashed into a string as a store identifier.
   * No need to memoize the store key.
   *
   * @param selectDeps (Optional) A function that return the dependency array (just like in `useEffect`), to trigger reactivity.
   *
   * Defaults to `undefined` (reactive to all state change) if you didn't set `defaultDeps` on `createStores`.
   *
   * Value of `null` will also make it reactive to all state change.
   *
   * **IMPORTANT NOTE:** `selectDeps` must not be changed after initialization.
   */
  (...args: [Maybe<TKey>, SelectDeps<T>?] | [SelectDeps<T>?]): T;
  get: (key?: Maybe<TKey>) => T;
  getAll: () => T[];
  getAllWithSubscriber: () => T[];
  set: (key: Maybe<TKey>, value: SetStoreState<T>, silent?: boolean) => void;
  setAll: (value: SetStoreState<T>, silent?: boolean) => void;
  subscribe: (key: Maybe<TKey>, fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getSubscribers: (key: Maybe<TKey>) => Subscribers<T>;
  getStore: (key?: Maybe<TKey>) => InitStoreReturn<T>;
  getStores: () => Map<string, InitStoreReturn<T>>;
  /**
   * ⚛️ (**_Hook_**)
   *
   * Set default values **inside of a component**.
   *
   * **IMPORTANT NOTE:**
   * - This is a hook, put it inside of a React component
   * - Put this on the root component or parent component, before any component subscribed!
   */
  setDefaultValues: (key: Maybe<TKey>, values: SetStoreState<T>) => void;
  Watch: (props: WatchProps<T> & { storeKey?: Maybe<TKey> }) => any;
};

export type CreateStoresOptions<
  TKey extends StoreKey = StoreKey,
  T extends StoreState = StoreState,
> = InitStoreOptions<T> & {
  onBeforeChangeKey?: (nextKey: TKey, prevKey: TKey) => void;
  /**
   * Will be triggered when a single store with a specific key was initialized.
   */
  onStoreInitialized?: (key: TKey, keyHash: string) => void;
  defaultDeps?: SelectDeps<T>;
  hashKeyFn?: (obj: TKey) => string;
};

export const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort());

/**
 * @see https://floppy-disk.vercel.app/docs/api#createstores
 */
export const createStores = <TKey extends StoreKey = StoreKey, T extends StoreState = StoreState>(
  initializer: StoresInitializer<TKey, T>,
  options: CreateStoresOptions<TKey, T> = {},
): UseStores<TKey, T> => {
  const {
    onBeforeChangeKey = noop,
    onStoreInitialized = noop,
    defaultDeps,
    hashKeyFn = hashStoreKey,
  } = options;

  const stores = new Map<string, InitStoreReturn<T>>();

  const getStore = (_key: Maybe<TKey>) => {
    const key = _key || ({} as TKey);
    const keyHash = hashKeyFn(key);
    if (!stores.has(keyHash)) {
      stores.set(
        keyHash,
        initStore((api) => getValue(initializer, { key, keyHash, ...api }), options),
      );
      onStoreInitialized(key, keyHash);
    }
    return stores.get(keyHash)!;
  };

  /**
   * **IMPORTANT NOTE:** `selectDeps` function must not be changed after initialization.
   */
  const useStores = (...args: [Maybe<TKey>, SelectDeps<T>?] | [SelectDeps<T>?]) => {
    const [_key, selectDeps = defaultDeps] = (
      typeof args[0] === 'function' ? [{}, args[0]] : args
    ) as [TKey, SelectDeps<T>];
    const key = _key || ({} as TKey);
    const keyHash = hashKeyFn(key);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { get, subscribe } = useMemo(() => getStore(key), [keyHash]);

    const [, setState] = useState(get);

    const prevKey = useRef(key);
    const prevKeyHash = useRef(keyHash);

    useEffect(() => {
      prevKey.current = key;
      prevKeyHash.current = keyHash;
      const unsubs = subscribe(setState, selectDeps);
      return unsubs;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyHash]);

    if (keyHash !== prevKeyHash.current) onBeforeChangeKey(key, prevKey.current);

    return get();
  };

  useStores.get = (key?: Maybe<TKey>) => {
    const store = getStore(key);
    return store.get();
  };
  useStores.getAll = () => {
    const allStores: T[] = [];
    stores.forEach((store) => {
      allStores.push(store.get());
    });
    return allStores;
  };
  useStores.getAllWithSubscriber = () => {
    const allStores: T[] = [];
    stores.forEach((store) => {
      const subscribers = store.getSubscribers();
      if (subscribers.size > 0) allStores.push(store.get());
    });
    return allStores;
  };

  useStores.set = (key: Maybe<TKey>, value: SetStoreState<T>, silent?: boolean) => {
    const store = getStore(key);
    store.set(value, silent);
  };
  useStores.setAll = (value: SetStoreState<T>, silent?: boolean) => {
    stores.forEach((store) => {
      store.set(value, silent);
    });
  };

  useStores.subscribe = (
    key: Maybe<TKey>,
    fn: (state: T) => void,
    selectDeps: SelectDeps<T> = defaultDeps,
  ) => {
    const store = getStore(key);
    return store.subscribe(fn, selectDeps);
  };
  useStores.getSubscribers = (key: Maybe<TKey>) => {
    const store = getStore(key);
    return store.getSubscribers();
  };

  useStores.getStore = (key?: Maybe<TKey>) => getStore(key);
  useStores.getStores = () => stores;

  useStores.setDefaultValues = (key: Maybe<TKey>, value: SetStoreState<T>) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      const store = getStore(key);
      const subscribers = store.getSubscribers();
      if (subscribers.size > 0) {
        console.warn(
          'Put setDefaultValues on the root component or parent component, before any component subscribed!',
        );
      }
      store.set(value);
    });
  };

  const Watch = ({
    storeKey,
    selectDeps = defaultDeps,
    render,
  }: WatchProps<T> & { storeKey?: Maybe<TKey> }) => {
    const store = useStores(storeKey, selectDeps);
    return render(store);
  };
  useStores.Watch = Watch;

  return useStores;
};
