import { useEffect, useState } from 'react';

import {
  initStore,
  InitStoreOptions,
  SelectDeps,
  SetStoreData,
  StoreData,
  StoreInitializer,
  Subscribers,
} from '../vanilla';

export type UseStore<T extends StoreData> = {
  (selectDeps?: SelectDeps<T>): T;
  getSubscribers: () => Subscribers<T>;
  subscribe: (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
};

export const createStore = <T extends StoreData>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> & {
    defaultDeps?: SelectDeps<T>;
  } = {},
): UseStore<T> => {
  const { getSubscribers, subscribe, getData, setData } = initStore(initializer, options);
  const { defaultDeps } = options;

  /**
   * Important note: selectDeps function must not be changed after initialization
   */
  const useStore = (selectDeps: SelectDeps<T> = defaultDeps) => {
    const [state, setState] = useState(getData);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => subscribe(setState, selectDeps), []);

    return state;
  };

  useStore.getSubscribers = getSubscribers;
  useStore.subscribe = subscribe;
  useStore.get = getData;
  useStore.set = setData;

  return useStore;
};
