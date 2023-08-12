import { useEffect, useMemo, useRef, useState } from 'react';

import {
  initStore,
  InitStoreOptions,
  InitStoreReturn,
  SelectDeps,
  SetStoreData,
  StoreData,
  Subscribers,
} from '../vanilla';

const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort());

export type StoreKey = Record<string, any> | undefined;

export type StoresEvent<T> = (key: StoreKey, state: T, subscribers: Subscribers<T>) => void;

export type StoresInitializer<T> = (api: {
  key: StoreKey;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
  get: () => T;
  getSubscribers: () => Subscribers<T>;
}) => T;

export type UseStores<T extends StoreData, TKey extends StoreKey = StoreKey> = {
  (key?: TKey, selectDeps?: SelectDeps<T>): T;
  getSubscribers: (key: TKey) => Subscribers<T>;
  subscribe: (key: TKey, fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  get: (key: TKey) => T;
  set: (key: TKey, value: SetStoreData<T>, silent?: boolean) => void;
  setAll: (value: SetStoreData<T>, silent?: boolean) => void;
};

export const createStores = <T extends StoreData, TKey extends StoreKey = StoreKey>(
  initializer: StoresInitializer<T>,
  options: InitStoreOptions<T> & {
    defaultDeps?: SelectDeps<T>;
  } = {},
): UseStores<T, TKey> => {
  const { defaultDeps } = options;

  const stores = new Map<string, InitStoreReturn<T>>();

  const getStore = (key: StoreKey) => {
    const normalizedKey = hashStoreKey(key);
    if (!stores.has(normalizedKey)) {
      stores.set(
        normalizedKey,
        initStore((api) => initializer({ key, ...api }), options),
      );
    }
    return stores.get(normalizedKey)!;
  };

  /**
   * Important note: selectDeps function must not be changed after initialization
   */
  const useStores = (key: StoreKey = {}, selectDeps: SelectDeps<T> = defaultDeps) => {
    const normalizedKey = hashStoreKey(key);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { subscribe, getData } = useMemo(() => getStore(key), [normalizedKey]);

    const [state, setState] = useState(getData);

    const isFirstRender = useRef(true);
    useEffect(() => {
      if (!isFirstRender.current) setState(getData);
      isFirstRender.current = false;
      const unsubs = subscribe(setState, selectDeps);
      return unsubs;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedKey]);

    return state;
  };

  useStores.getSubscribers = (key: StoreKey = {}) => {
    const store = getStore(key);
    return store.getSubscribers();
  };
  useStores.subscribe = (
    key: StoreKey = {},
    fn: (state: T) => void,
    selectDeps?: SelectDeps<T>,
  ) => {
    const store = getStore(key);
    return store.subscribe(fn, selectDeps);
  };
  useStores.get = (key: StoreKey = {}) => {
    const store = getStore(key);
    return store.getData();
  };
  useStores.set = (key: StoreKey = {}, value: SetStoreData<T>, silent?: boolean) => {
    const store = getStore(key);
    store.setData(value, silent);
  };
  useStores.setAll = (value: SetStoreData<T>, silent?: boolean) => {
    stores.forEach((store) => {
      store.setData(value, silent);
    });
  };

  return useStores;
};
