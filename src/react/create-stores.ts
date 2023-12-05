import { useEffect, useMemo, useRef, useState } from 'react';

import { getValue, hashStoreKey, Maybe, noop } from '../utils';
import {
  initStore,
  InitStoreOptions,
  InitStoreReturn,
  SelectDeps,
  SetStoreData,
  StoreData,
  Subscribers,
} from '../vanilla';
import { WatchProps } from './create-store';

export type StoreKey = Record<string, any> | undefined;

export type StoresInitializer<TKey extends StoreKey = StoreKey, T extends StoreData = StoreData> =
  | T
  | ((api: {
      get: () => T;
      set: (value: SetStoreData<T>, silent?: boolean) => void;
      key: TKey;
      keyHash: string;
    }) => T);

export type UseStores<TKey extends StoreKey = StoreKey, T extends StoreData = StoreData> = {
  /**
   * @param key (Optional) Store key, an object that will be hashed into a string as a store identifier.
   * No need to memoize the store key.
   *
   * @param selectDeps (Optional) A function that return the dependency array (just like in `useEffect`), to trigger reactivity.
   * Defaults to `undefined` (reactive to all state change) if you didn't set `defaultDeps` on `createStores`.
   *
   * Since version `2.13.0`, we can use a store's object key to control reactivity.
   *
   * **IMPORTANT NOTE:** `selectDeps` must not be changed after initialization.
   *
   * @example
   * ```tsx
   * type StoreKey = { id: string };
   * type StoreData = { foo: number; bar: boolean; baz: string };
   * const useMyStores = createStores<StoreKey, StoreData>({
   *   foo: 12,
   *   bar: true,
   *   baz: "z",
   * });
   *
   * export const MyComponent = () => {
   *   const foo = useMyStores({ id: "p1" }, "foo");
   *   // Will only re-render if "foo" & store key ("id") updated
   * };
   * ```
   */
  <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(selectDeps?: K): K extends keyof T ? T[K] : T;
  <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(
    key: Maybe<TKey>,
    selectDeps?: K,
  ): K extends keyof T ? T[K] : T;
  get: (key?: Maybe<TKey>) => T;
  getAll: () => T[];
  getAllWithSubscriber: () => T[];
  set: (key: Maybe<TKey>, value: SetStoreData<T>, silent?: boolean) => void;
  setAll: (value: SetStoreData<T>, silent?: boolean) => void;
  subscribe: (
    key: Maybe<TKey>,
    fn: (state: T) => void,
    selectDeps?: SelectDeps<T> | keyof T,
  ) => () => void;
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
  setDefaultValues: (key: Maybe<TKey>, values: SetStoreData<T>) => void;
  Watch: <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(
    props: WatchProps<T, K> & { storeKey?: Maybe<TKey> },
  ) => any;
};

export type CreateStoresOptions<
  TKey extends StoreKey = StoreKey,
  T extends StoreData = StoreData,
> = InitStoreOptions<T> & {
  onBeforeChangeKey?: (nextKey: TKey, prevKey: TKey) => void;
  /**
   * Will be triggered when a single store with a specific key was initialized.
   */
  onStoreInitialized?: (key: TKey, keyHash: string) => void;
  defaultDeps?: SelectDeps<T>;
  hashKeyFn?: (obj: TKey) => string;
};

/**
 * @see https://floppy-disk.vercel.app/docs/api#createstores
 */
export const createStores = <TKey extends StoreKey = StoreKey, T extends StoreData = StoreData>(
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
  const useStores = <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(
    ...args: [Maybe<TKey>, K?] | [K?]
  ) => {
    const [_key, selectDeps = defaultDeps] = (
      typeof args[0] === 'function' || typeof args[0] === 'string' ? [{}, args[0]] : args
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

    const state = get();

    type UseStoresReturn = K extends keyof T ? T[K] : T;
    return (typeof selectDeps === 'string' ? state[selectDeps] : state) as UseStoresReturn;
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

  useStores.set = (key: Maybe<TKey>, value: SetStoreData<T>, silent?: boolean) => {
    const store = getStore(key);
    store.set(value, silent);
  };
  useStores.setAll = (value: SetStoreData<T>, silent?: boolean) => {
    stores.forEach((store) => {
      store.set(value, silent);
    });
  };

  useStores.subscribe = (
    key: Maybe<TKey>,
    fn: (state: T) => void,
    selectDeps: SelectDeps<T> | keyof T = defaultDeps,
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

  useStores.setDefaultValues = (key: Maybe<TKey>, value: SetStoreData<T>) => {
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

  const Watch = <K extends SelectDeps<T> | keyof T = SelectDeps<T>>({
    storeKey,
    selectDeps = defaultDeps as K,
    render,
  }: WatchProps<T, K> & { storeKey?: Maybe<TKey> }) => {
    const store = useStores(storeKey, selectDeps);
    return render(store);
  };
  useStores.Watch = Watch;

  return useStores;
};
