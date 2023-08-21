import { useEffect, useMemo, useRef, useState } from 'react';

import { noop } from '../utils';
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

const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort());

export type StoreKey = Record<string, any> | undefined;

export type StoresInitializer<
  TKey extends StoreKey = StoreKey,
  T extends StoreData = StoreData,
> = (api: {
  key: TKey;
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
}) => T;

export type UseStores<TKey extends StoreKey = StoreKey, T extends StoreData = StoreData> = {
  /**
   * @param key (Optional) Store key, an object that will be hashed into a string as a store identifier.
   *
   * @param selectDeps A function that return the dependency array (just like in `useEffect`), to trigger reactivity.
   * Defaults to `undefined` (reactive to all state change) if you didn't set `defaultDeps` on `createStores`.
   *
   * IMPORTANT NOTE: `selectDeps` must not be changed after initialization.
   */
  (...args: [TKey?, SelectDeps<T>?] | [SelectDeps<T>?]): T;
  get: (key?: TKey) => T;
  getAll: () => T[];
  getAllWithSubscriber: () => T[];
  set: (key: TKey, value: SetStoreData<T>, silent?: boolean) => void;
  setAll: (value: SetStoreData<T>, silent?: boolean) => void;
  subscribe: (key: TKey, fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getSubscribers: (key: TKey) => Subscribers<T>;
  Watch: (props: WatchProps<T> & { storeKey?: TKey }) => any;
};

export type CreateStoresOptions<
  TKey extends StoreKey = StoreKey,
  T extends StoreData = StoreData,
> = InitStoreOptions<T> & {
  onBeforeChangeKey?: (nextKey: TKey, prevKey: TKey) => void;
  defaultDeps?: SelectDeps<T>;
  hashKeyFn?: (obj: TKey) => string;
};

export const createStores = <TKey extends StoreKey = StoreKey, T extends StoreData = StoreData>(
  initializer: StoresInitializer<TKey, T>,
  options: CreateStoresOptions<TKey, T> = {},
): UseStores<TKey, T> => {
  const { onBeforeChangeKey = noop, defaultDeps, hashKeyFn = hashStoreKey } = options;

  const stores = new Map<string, InitStoreReturn<T>>();

  const getStore = (key: TKey) => {
    const normalizedKey = hashKeyFn(key);
    if (!stores.has(normalizedKey)) {
      stores.set(
        normalizedKey,
        initStore((api) => initializer({ key, ...api }), options),
      );
    }
    return stores.get(normalizedKey)!;
  };

  /**
   * IMPORTANT NOTE: selectDeps function must not be changed after initialization.
   */
  const useStores = (...args: [TKey?, SelectDeps<T>?] | [SelectDeps<T>?]) => {
    const [_key = {}, selectDeps = defaultDeps] = (
      typeof args[0] === 'function' ? [{}, args[0]] : args
    ) as [TKey, SelectDeps<T>];
    const key = _key as TKey;

    const normalizedKey = hashKeyFn(key);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { get, subscribe } = useMemo(() => getStore(key), [normalizedKey]);

    const [state, setState] = useState(get);

    const isFirstRender = useRef(true);
    const prevKey = useRef(key);
    useEffect(() => {
      if (!isFirstRender.current) {
        onBeforeChangeKey(key, prevKey.current);
        setState(get);
      }
      isFirstRender.current = false;
      prevKey.current = key;
      const unsubs = subscribe(setState, selectDeps);
      return unsubs;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedKey]);

    return state;
  };

  useStores.get = (key: TKey = {} as TKey) => {
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

  useStores.set = (key: TKey = {} as TKey, value: SetStoreData<T>, silent?: boolean) => {
    const store = getStore(key);
    store.set(value, silent);
  };
  useStores.setAll = (value: SetStoreData<T>, silent?: boolean) => {
    stores.forEach((store) => {
      store.set(value, silent);
    });
  };

  useStores.subscribe = (
    key: TKey = {} as TKey,
    fn: (state: T) => void,
    selectDeps?: SelectDeps<T>,
  ) => {
    const store = getStore(key);
    return store.subscribe(fn, selectDeps);
  };
  useStores.getSubscribers = (key: TKey = {} as TKey) => {
    const store = getStore(key);
    return store.getSubscribers();
  };

  const Watch = ({ storeKey = {}, selectDeps, render }: WatchProps<T> & { storeKey?: TKey }) => {
    const store = useStores(storeKey as TKey, selectDeps);
    return render(store);
  };
  useStores.Watch = Watch;

  return useStores;
};
