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

export type WatchProps<T, K extends SelectDeps<T> | keyof T = SelectDeps<T>> = {
  selectDeps?: K;
  render: (state: K extends keyof T ? T[K] : T) => any;
};

export type UseStore<T extends StoreData> = {
  /**
   * @param selectDeps (Optional) A function that return the dependency array (just like in `useEffect`), to trigger reactivity.
   * Defaults to `undefined` (reactive to all state change) if you didn't set `defaultDeps` on `createStore`.
   *
   * Since version `2.13.0`, we can use a store's object key to control reactivity.
   *
   * **IMPORTANT NOTE:** `selectDeps` must not be changed after initialization.
   *
   * @example
   * ```tsx
   * const useMyStore = createStore({
   *   foo: 12,
   *   bar: true,
   *   baz: "z",
   * });
   *
   * const MyComponent = () => {
   *   const foo = useMyStore("foo");
   *   // Will only re-render if "foo" updated
   * };
   * ```
   */
  <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(selectDeps?: K): K extends keyof T ? T[K] : T;
  get: () => T;
  set: (value: SetStoreData<T>, silent?: boolean) => void;
  subscribe: (fn: (state: T) => void, selectDeps?: SelectDeps<T> | keyof T) => () => void;
  getSubscribers: () => Subscribers<T>;
  /**
   * ⚛️ (**_Hook_**)
   *
   * Set default values **inside of a component**.
   *
   * **IMPORTANT NOTE:**
   * - This is a hook, put it inside of a React component
   * - Put this on the root component or parent component, before any component subscribed!
   */
  setDefaultValues: (values: SetStoreData<T>) => void;
  Watch: <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(props: WatchProps<T, K>) => any;
};

/**
 * @see https://floppy-disk.vercel.app/docs/api#createstore
 */
export const createStore = <T extends StoreData>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> & {
    defaultDeps?: SelectDeps<T>;
  } = {},
): UseStore<T> => {
  const { get, set, subscribe, getSubscribers } = initStore(initializer, options);
  const { defaultDeps } = options;

  /**
   * **IMPORTANT NOTE:** `selectDeps` function must not be changed after initialization.
   */
  const useStore = <K extends SelectDeps<T> | keyof T = SelectDeps<T>>(
    selectDeps = defaultDeps as K,
  ) => {
    const [state, setState] = useState(get);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => subscribe(setState, selectDeps), []);

    type UseStoreReturn = K extends keyof T ? T[K] : T;
    return (typeof selectDeps === 'string' ? state[selectDeps] : state) as UseStoreReturn;
  };

  useStore.get = get;
  useStore.set = set;
  useStore.subscribe = subscribe;
  useStore.getSubscribers = getSubscribers;

  useStore.setDefaultValues = (value: SetStoreData<T>) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      const subscribers = getSubscribers();
      if (subscribers.size > 0) {
        console.warn(
          'Put setDefaultValues on the root component or parent component, before any component subscribed!',
        );
      }
      set(value);
    });
  };

  const Watch = <K extends SelectDeps<T> | keyof T = SelectDeps<T>>({
    selectDeps = defaultDeps as K,
    render,
  }: WatchProps<T, K>) => {
    const store = useStore(selectDeps);
    return render(store);
  };
  useStore.Watch = Watch;

  return useStore;
};
