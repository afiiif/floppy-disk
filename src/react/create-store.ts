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
  /**
   * @param selectDeps A function that return the dependency array (just like in `useEffect`), to trigger reactivity.
   * Defaults to `undefined` (reactive to all state change) if you didn't set `defaultDeps` on `createStore`.
   *
   * IMPORTANT NOTE: `selectDeps` must not be changed after initialization.
   */
  (selectDeps?: SelectDeps<T>): T;
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
  subscribe: (fn: (state: T) => void, selectDeps?: SelectDeps<T>) => () => void;
  getSubscribers: () => Subscribers<T>;
};

export const createStore = <T extends StoreData>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> & {
    defaultDeps?: SelectDeps<T>;
  } = {},
): UseStore<T> => {
  const { get, set, subscribe, getSubscribers } = initStore(initializer, options);
  const { defaultDeps } = options;

  /**
   * IMPORTANT NOTE: selectDeps function must not be changed after initialization.
   */
  const useStore = (selectDeps: SelectDeps<T> = defaultDeps) => {
    const [state, setState] = useState(get);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => subscribe(setState, selectDeps), []);

    return state;
  };

  useStore.get = get;
  useStore.set = set;
  useStore.subscribe = subscribe;
  useStore.getSubscribers = getSubscribers;

  return useStore;
};
