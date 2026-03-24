import { useRef, useState } from 'react';
import {
  type InitStoreOptions,
  type SetState,
  type StoreApi,
  getHash,
  identity,
  initStore,
  isClient,
  noop,
  shallow,
} from '../vanilla.ts';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.ts';

export type QueryState<TData> = {
  isPending: boolean;
  isRevalidating: boolean;
  isRetrying: boolean;
  retryCount: number;
} & (
  | {
      state: 'INITIAL';
      isSuccess: false;
      isError: false;
      data: undefined;
      dataUpdatedAt: undefined;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: 'SUCCESS';
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: 'ERROR';
      isSuccess: false;
      isError: true;
      data: undefined;
      dataUpdatedAt: undefined;
      error: any;
      errorUpdatedAt: number;
    }
  | {
      state: 'SUCCESS_BUT_REVALIDATION_ERROR';
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      error: any;
      errorUpdatedAt: number;
    }
);

export type QueryOptions<TData, TVariable extends Record<string, any>> = InitStoreOptions<
  QueryState<TData>
> & {
  staleTime?: number; // milliseconds
  gcTime?: number; // milliseconds
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  onSuccess?: (data: TData, variable: TVariable, stateBeforeExecute: QueryState<TData>) => void;
  onError?: (error: any, variable: TVariable, stateBeforeExecute: QueryState<TData>) => void;
  onSettled?: (variable: TVariable, stateBeforeExecute: QueryState<TData>) => void;
  shouldRetry?: (error: any, currentState: QueryState<TData>) => [true, number] | [false];
};

export const createQuery = <TData, TVariable extends Record<string, any> = never>(
  queryFn: (variable: TVariable, currentState: QueryState<TData>) => Promise<TData>,
  options: QueryOptions<TData, TVariable> = {},
) => {
  const {
    staleTime = 2500, // 2.5 seconds,
    gcTime = 5 * 60 * 1000, // 5 minutes
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    onSuccess = noop,
    onError,
    onSettled = noop,
    shouldRetry: shouldRetryFn = (_, s) => (s.retryCount === 0 ? [true, 1500] : [false]),
  } = options;

  type TState = QueryState<TData>;

  const initialState = {
    isPending: false,
    isRevalidating: false,
    isRetrying: false,
    retryCount: 0,
    state: 'INITIAL',
    isSuccess: false,
    isError: false,
    data: undefined,
    dataUpdatedAt: undefined,
    error: undefined,
    errorUpdatedAt: undefined,
  } as TState;

  const stores = new Map<string, StoreApi<TState>>();

  const configureStoreEvents = (): InitStoreOptions<TState> => ({
    ...options,
    onFirstSubscribe: (state, store) => {
      options.onFirstSubscribe?.(state, store);
      // Cancel garbage collection timeout
      const { metadata, revalidate } = internals.get(store)!;
      clearTimeout(metadata.garbageCollectionTimeoutId);
      // Attach window events
      if (isClient) {
        if (revalidateOnFocus) {
          focusListeners.add(revalidate);
          if (!focusListenersAdded) {
            window.addEventListener('focus', onWindowFocus);
            focusListenersAdded = true;
          }
        }
        if (revalidateOnReconnect) {
          onlineListeners.add(revalidate);
          if (!onlineListenersAdded) {
            window.addEventListener('online', onWindowOnline);
            onlineListenersAdded = true;
          }
        }
      }
    },
    onLastUnsubscribe: (state, store) => {
      options.onLastUnsubscribe?.(state, store);
      // Start garbage collection timeout
      const { metadata, revalidate } = internals.get(store)!;
      metadata.garbageCollectionTimeoutId = setTimeout(() => {
        store.setState(initialState);
      }, gcTime);
      // Detach window events
      if (isClient) {
        if (revalidateOnFocus) {
          focusListeners.delete(revalidate);
          if (focusListeners.size === 0) {
            window.removeEventListener('focus', onWindowFocus);
            focusListenersAdded = false;
          }
        }
        if (revalidateOnReconnect) {
          onlineListeners.delete(revalidate);
          if (onlineListeners.size === 0) {
            window.removeEventListener('online', onWindowOnline);
            onlineListenersAdded = false;
          }
        }
      }
    },
  });

  // -------

  type Internal = {
    metadata: {
      promise?: Promise<TState> | undefined;
      promiseResolver?: ((value: TState | PromiseLike<TState>) => void) | undefined;
      retryTimeoutId?: number;
      retryResolver?: ((value: TState | PromiseLike<TState>) => void) | undefined;
      garbageCollectionTimeoutId?: number;
      rollbackData?: TData | undefined;
    };
    execute: () => Promise<TState>;
    revalidate: () => Promise<TState>;
    invalidate: () => void;
    reset: () => void;
    delete: () => boolean;
    optimisticUpdate: (data: TData) => {
      revalidate: () => Promise<TState>;
      rollback: () => TData;
    };
    rollbackOptimisticUpdate: () => TData;
  };
  const internals = new WeakMap<StoreApi<TState>, Internal>();

  const configureInternals = (
    store: StoreApi<TState>,
    variable: TVariable,
    variableHash: string,
  ): Internal => ({
    metadata: {},
    execute: () => execute(store, variable),
    revalidate: () => revalidate(store, variable),
    invalidate: () => store.setState({ dataUpdatedAt: 1 }),
    reset: () => {
      const { metadata } = internals.get(store)!;
      clearTimeout(metadata.retryTimeoutId);
      if (metadata.retryResolver || metadata.promiseResolver) {
        console.debug(
          'Ongoing query execution was ignored due to reset(). The result will not update the store state.',
        );
        metadata.promiseResolver?.(initialState);
        metadata.retryResolver?.(initialState);
        metadata.promiseResolver = undefined;
        metadata.retryResolver = undefined;
      }
      metadata.promise = undefined;
      store.setState(initialState);
    },
    delete: () => {
      if (store.getSubscribers().size > 0) {
        console.warn(
          'Cannot delete query store while it still has active subscribers. Unsubscribe all listeners before deleting the store.',
        );
        return false;
      }
      internals.get(store)!.reset();
      return stores.delete(variableHash);
    },
    optimisticUpdate: (optimisticData) => {
      const { metadata, revalidate, rollbackOptimisticUpdate } = internals.get(store)!;
      metadata.rollbackData = store.getState().data;
      store.setState({ data: optimisticData });
      return { revalidate, rollback: rollbackOptimisticUpdate };
    },
    rollbackOptimisticUpdate: () => {
      const { metadata } = internals.get(store)!;
      store.setState({ data: metadata.rollbackData! });
      return metadata.rollbackData!;
    },
  });

  const execute = async (store: StoreApi<TState>, variable: TVariable) => {
    const { metadata } = internals.get(store)!;
    if (metadata.promise) return metadata.promise;
    clearTimeout(metadata.retryTimeoutId);

    const createPromise = () => {
      const promise = new Promise<TState>((resolve) => {
        metadata.promiseResolver = resolve;
        const stateBeforeExecute = store.getState();
        store.setState({
          isPending: true,
          isRevalidating: stateBeforeExecute.state === 'SUCCESS',
          isRetrying: !!metadata.retryResolver,
          retryCount: metadata.retryResolver ? stateBeforeExecute.retryCount + 1 : 0,
        });
        queryFn(variable, stateBeforeExecute)
          .then((data) => {
            if (data === undefined) {
              console.error(
                'Query function returned undefined. Successful responses must not be undefined.',
              );
            }
            store.setState({
              isPending: false,
              isRevalidating: false,
              isRetrying: false,
              retryCount: 0,
              state: 'SUCCESS',
              isSuccess: true,
              isError: false,
              data,
              dataUpdatedAt: Date.now(),
              error: undefined,
              errorUpdatedAt: undefined,
            });
            metadata.rollbackData = data;
            resolve(store.getState());
            metadata.retryResolver?.(store.getState());
            metadata.retryResolver = undefined;
            onSuccess(data, variable, stateBeforeExecute);
            onSettled(variable, stateBeforeExecute);
          })
          .catch((error) => {
            store.setState({
              isPending: false,
              isRevalidating: false,
              isRetrying: false,
            });
            const [shouldRetry, retryDelay] = shouldRetryFn(error, store.getState());
            const hasSubscriber = store.getSubscribers().size > 0;
            if (shouldRetry && hasSubscriber) {
              metadata.retryResolver = resolve;
              metadata.retryTimeoutId = setTimeout(createPromise, retryDelay);
            } else {
              const state = store.getState();
              store.setState({
                isPending: false,
                isRevalidating: false,
                isRetrying: false,
                retryCount: 0,
                state: state.data ? 'SUCCESS_BUT_REVALIDATION_ERROR' : 'ERROR',
                error,
                errorUpdatedAt: Date.now(),
              });
              resolve(state);
              metadata.retryResolver?.(state);
              metadata.retryResolver = undefined;
              if (onError) onError(error, variable, stateBeforeExecute);
              else console.error(state);
              onSettled(variable, stateBeforeExecute);
            }
          })
          .finally(() => {
            metadata.promise = undefined;
            metadata.promiseResolver = undefined;
          });
      });
      metadata.promise = promise;
      return promise;
    };
    return createPromise();
  };

  const revalidate = async (store: StoreApi<TState>, variable: TVariable) => {
    const { metadata } = internals.get(store)!;
    if (metadata.promise) return metadata.promise;
    const state = store.getState();
    if (state.dataUpdatedAt && state.dataUpdatedAt + staleTime > Date.now()) return state;
    return execute(store, variable);
  };

  // -------

  const getStore = (variable: TVariable = {} as TVariable) => {
    const variableHash = getHash(variable);
    let store: StoreApi<TState>;
    if (stores.has(variableHash)) {
      store = stores.get(variableHash)!;
    } else {
      store = initStore(initialState, configureStoreEvents());
      stores.set(variableHash, store);
      internals.set(store, configureInternals(store, variable, variableHash));
    }

    const useStore = <TStateSlice = TState>(
      options: {
        enabled?: boolean;
        keepPreviousData?: boolean;
      } = {},
      selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
    ) => {
      // Store subscription & reactivity
      const [, reRender] = useState({});
      const selectorRef = useRef(selector);
      selectorRef.current = selector;
      useIsomorphicLayoutEffect(
        () =>
          store.subscribe((state, prevState) => {
            const prevSlice = selectorRef.current(prevState);
            const nextSlice = selectorRef.current(state);
            if (!shallow(prevSlice, nextSlice)) reRender({});
          }),
        [store],
      );

      // Execute queryFn on mount & on re-render
      useIsomorphicLayoutEffect(() => {
        if (options.enabled !== false) revalidate(store, variable);
      }, [store, options.enabled]);

      // Handle keepPreviousData
      const storeState = store.getState();
      let storeStateToBeUsed = storeState;
      const prevState = useRef<{ data?: TData; dataUpdatedAt?: number }>({});
      if (storeState.isSuccess) {
        prevState.current = { data: storeState.data, dataUpdatedAt: storeState.dataUpdatedAt };
      } else if (options.keepPreviousData) {
        storeStateToBeUsed = { ...storeState, ...prevState.current } as TState;
      }

      return selector(storeStateToBeUsed);
    };

    return Object.assign(useStore, {
      subscribe: store.subscribe,
      getSubscribers: store.getSubscribers,
      getState: store.getState,
      setState: (value: SetState<TState>) => {
        console.debug('Manual setState (not via provided actions) on query store');
        store.setState(value);
      },
      ...internals.get(store)!,
    });
  };

  return getStore;
};

let focusListenersAdded = false;
const focusListeners = new Set<() => void>();
const onWindowFocus = () => [...focusListeners].forEach((fn) => fn());

let onlineListenersAdded = false;
const onlineListeners = new Set<() => void>();
const onWindowOnline = () => [...onlineListeners].forEach((fn) => fn());
