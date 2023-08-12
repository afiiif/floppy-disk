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

export type StoresInitializer<
  TKey extends StoreKey = StoreKey,
  T extends StoreData = StoreData,
> = (api: {
  key: TKey;
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
}) => T;

export type UseStores<TKey extends StoreKey = StoreKey, T extends StoreData = StoreData> = {
  (key?: TKey, selectDeps?: SelectDeps<T>): T;
  get: (key?: TKey) => T;
  set: (key: TKey, value: SetStoreData<T>, silent?: boolean) => void;
  setAll: (value: SetStoreData<T>, silent?: boolean) => void;
  subscribe: (key: TKey, fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getSubscribers: (key: TKey) => Subscribers<T>;
};

export const createStores = <TKey extends StoreKey = StoreKey, T extends StoreData = StoreData>(
  initializer: StoresInitializer<TKey, T>,
  options: InitStoreOptions<T> & {
    defaultDeps?: SelectDeps<T>;
  } = {},
): UseStores<TKey, T> => {
  const { defaultDeps } = options;

  const stores = new Map<string, InitStoreReturn<T>>();

  const getStore = (key: TKey) => {
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
  const useStores = (key: TKey = {} as TKey, selectDeps: SelectDeps<T> = defaultDeps) => {
    const normalizedKey = hashStoreKey(key);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const { get, subscribe } = useMemo(() => getStore(key), [normalizedKey]);

    const [state, setState] = useState(get);

    const isFirstRender = useRef(true);
    useEffect(() => {
      if (!isFirstRender.current) setState(get);
      isFirstRender.current = false;
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

  return useStores;
};
