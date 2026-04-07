import { useRef, useState } from "react";
import {
  type InitStoreOptions,
  type SetState,
  type StoreApi,
  getHash,
  initStore,
  isClient,
  noop,
} from "../vanilla.ts";
import type { StoreKey } from "./create-stores.ts";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.ts";
import {
  NO_INITIAL_VALUE,
  compressPaths,
  getValueByPath,
  useStoreStateProxy,
  useStoreStateWithInitializer,
} from "./use-store.ts";

/**
 * Represents the state of a query.
 *
 * @remarks
 * A query manages cached results of an async operation with lifecycle awareness.
 *
 * State variants:
 * - `INITIAL` → no execution has occurred yet
 * - `SUCCESS` → execution completed successfully
 * - `ERROR` → initial execution failed (no data available)
 * - `SUCCESS_BUT_REVALIDATION_ERROR` → data exists, but a revalidation failed
 *
 * Flags:
 * - `isPending` → an execution is currently in progress
 * - `isRevalidating` → re-executing while already having data
 * - `isRetrying` → retrying after a failure
 *
 * @remarks
 * - Data and error are mutually exclusive except in `SUCCESS_BUT_REVALIDATION_ERROR`.
 */
export type QueryState<TData, TError> = {
  isPending: boolean;
  isRevalidating: boolean;
  willRetryAt: undefined | number;
  isRetrying: boolean;
  retryCount: number;
} & (
  | {
      state: "INITIAL";
      isSuccess: false;
      isError: false;
      data: undefined;
      dataUpdatedAt: undefined;
      dataStaleAt: undefined;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: "SUCCESS";
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      dataStaleAt: undefined | number;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: "ERROR";
      isSuccess: false;
      isError: true;
      data: undefined;
      dataUpdatedAt: undefined;
      dataStaleAt: undefined;
      error: TError;
      errorUpdatedAt: number;
    }
  | {
      state: "SUCCESS_BUT_REVALIDATION_ERROR";
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      dataStaleAt: undefined | number;
      error: TError;
      errorUpdatedAt: number;
    }
);

const INITIAL_STATE: QueryState<any, any> = {
  isPending: false,
  isRevalidating: false,
  willRetryAt: undefined,
  isRetrying: false,
  retryCount: 0,
  state: "INITIAL",
  isSuccess: false,
  isError: false,
  data: undefined,
  dataUpdatedAt: undefined,
  dataStaleAt: undefined,
  error: undefined,
  errorUpdatedAt: undefined,
};

/**
 * Configuration options for a query.
 *
 * @remarks
 * Controls caching, retry behavior, lifecycle, and side effects of an async operation.
 */
export type QueryOptions<TData, TVariable extends StoreKey, TError = Error> = InitStoreOptions<
  QueryState<TData, TError>,
  { variableHash: string }
> & {
  /**
   * Time (in milliseconds) that data is considered fresh.
   *
   * While fresh, revalidation will be skipped unless explicitly invalidated.
   *
   * @default 2500 ms (2.5 seconds)
   */
  staleTime?: number;

  /**
   * Time (in milliseconds) before unused queries are garbage collected.
   *
   * Starts counting after the last subscriber unsubscribes.
   *
   * @default 5 minutes
   */
  gcTime?: number;

  /**
   * Whether to revalidate when the window gains focus.
   *
   * @default true
   */
  revalidateOnFocus?: boolean;

  /**
   * Whether to revalidate when the network reconnects.
   *
   * @default true
   */
  revalidateOnReconnect?: boolean;

  /**
   * Called when the query succeeds.
   */
  onSuccess?: (
    data: TData,
    variable: TVariable,
    stateBeforeExecute: QueryState<TData, TError>,
  ) => void;

  /**
   * Called when the query fails and will not retry.
   */
  onError?: (
    error: TError,
    variable: TVariable,
    stateBeforeExecute: QueryState<TData, TError>,
  ) => void;

  /**
   * Called after the query settles (success or final failure).
   */
  onSettled?: (variable: TVariable, stateBeforeExecute: QueryState<TData, TError>) => void;

  /**
   * Determines whether a failed query should retry.
   *
   * @returns
   * - `[true, delay]` to retry after `delay` milliseconds
   * - `[false]` to stop retrying
   *
   * @default Retries once after 1500ms
   *
   * @example
   * shouldRetry: (error, state) => {
   *   if (error?.status === 401 || error?.code === 'UNAUTHORIZED') return [false];
   *   if (state.retryCount < 3) return [true, 1000 * 2 ** state.retryCount];
   *   return [false];
   * }
   */
  shouldRetry?: (
    error: TError,
    currentState: QueryState<TData, TError>,
  ) => [true, number] | [false];
};

/**
 * Creates a query factory for managing cached async operations.
 *
 * @param queryFn - Async function to resolve data
 * @param options - Optional configuration for caching, retry, and lifecycle
 *
 * @returns A function to retrieve or create a query instance by variable
 *
 * @remarks
 * - Queries are **keyed by variable** (via deterministic hashing).
 * - Each unique variable maps to its own store instance.
 *
 * Core features:
 * - Caching via `staleTime`
 * - Explicit invalidation (independent of freshness)
 * - Retry logic via `shouldRetry`
 * - Background revalidation (focus / reconnect)
 * - Garbage collection via `gcTime`
 *
 * Execution behavior:
 * - By default, executions **overwrite ongoing executions**
 * - Set `overwriteOngoingExecution: false` to enable deduplication
 * - Internal revalidation (focus/reconnect) uses deduplication by default
 *
 * @example
 * const userQuery = createQuery<UserDetail, { id: string }>(async ({ id }) => {
 *   return api.getUser(id);
 * });
 *
 * function MyComponent({ id }: { id: string }) {
 *   const useUserQuery = userQuery({ id });
 *   const state = useUserQuery();
 *   // ...
 * }
 *
 * @see https://floppy-disk.vercel.app/docs/query
 */
export const createQuery = <TData, TVariable extends StoreKey = never, TError = Error>(
  queryFn: (
    variable: TVariable,
    currentState: QueryState<TData, TError>,
    variableHash: string,
  ) => Promise<TData>,
  options: QueryOptions<TData, TVariable, TError> = {},
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

  type TState = QueryState<TData, TError>;
  type TStore = StoreApi<TState> & { variableHash: string };

  const initialState = { ...INITIAL_STATE } as TState;

  const stores = new Map<string, TStore>();

  const configureStoreEvents = (
    variableHash: string,
  ): InitStoreOptions<TState, { variableHash: string }> => ({
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
            window.addEventListener("focus", onWindowFocus);
            focusListenersAdded = true;
          }
        }
        if (revalidateOnReconnect) {
          onlineListeners.add(revalidate);
          if (!onlineListenersAdded) {
            window.addEventListener("online", onWindowOnline);
            onlineListenersAdded = true;
          }
        }
      }
    },
    onLastUnsubscribe: (state, store) => {
      options.onLastUnsubscribe?.(state, store);
      // Cancel retry
      const { metadata, revalidate } = internals.get(store)!;
      clearTimeout(metadata.retryTimeoutId);
      if (metadata.retryResolver) {
        store.setState({ willRetryAt: undefined });
        metadata.retryResolver(store.getState());
        metadata.retryResolver = undefined;
      }
      // Start garbage collection timeout
      metadata.garbageCollectionTimeoutId = setTimeout(() => {
        if (metadata.promiseResolver || metadata.retryResolver) {
          store.setState(initialState);
        } else {
          stores.delete(variableHash);
        }
      }, gcTime);
      // Detach window events
      if (isClient) {
        if (revalidateOnFocus) {
          focusListeners.delete(revalidate);
          if (focusListeners.size === 0) {
            window.removeEventListener("focus", onWindowFocus);
            focusListenersAdded = false;
          }
        }
        if (revalidateOnReconnect) {
          onlineListeners.delete(revalidate);
          if (onlineListeners.size === 0) {
            window.removeEventListener("online", onWindowOnline);
            onlineListenersAdded = false;
          }
        }
      }
    },
  });

  // -------

  type Internal = {
    /**
     * Internal data, do not mutate!
     */
    metadata: {
      isInvalidated?: boolean;
      promise?: Promise<TState> | undefined;
      promiseResolver?: ((value: TState | PromiseLike<TState>) => void) | undefined;
      retryTimeoutId?: number;
      retryResolver?: ((value: TState | PromiseLike<TState>) => void) | undefined;
      garbageCollectionTimeoutId?: number;
      rollbackData?: TData | undefined;
    };

    /**
     * Sets initial data for the query if it has not been initialized.
     *
     * @param data - Initial data
     * @param revalidate - Whether to mark the data as invalidated (will trigger revalidation)
     *
     * @returns `true` if the data was set, `false` otherwise
     *
     * @remarks
     * - Only applies when the query is in the `INITIAL` state.
     * - Useful for hydration or preloaded data.
     */
    setInitialData: (data: TData, revalidate?: boolean) => boolean;

    /**
     * Executes the query function.
     *
     * @param options - Execution options
     * @param options.overwriteOngoingExecution - Whether to start a new execution instead of reusing an ongoing one (default: `true`)
     *
     * @returns A promise resolving to the latest query state
     *
     * @remarks
     * - By default, each call **starts a new execution** even if one is already in progress.
     * - Set `overwriteOngoingExecution: false` to reuse an ongoing execution (deduplication).
     * - Handles:
     *   - Pending state
     *   - Success state
     *   - Error state
     *   - Retry logic
     */
    execute: (options?: { overwriteOngoingExecution?: boolean }) => Promise<TState>;

    /**
     * Re-executes the query if needed based on freshness or invalidation.
     *
     * @param options - Revalidation options
     * @param options.overwriteOngoingExecution - Whether to overwrite an ongoing execution (default: `true`)
     *
     * @returns The current state if still fresh, otherwise a promise of the new state
     *
     * @remarks
     * - Skips execution if data is still fresh (`staleTime`) **AND** the query has not been invalidated.
     * - If execution is not skipped, by default it will start a new execution even if one is already in progress.
     * - Set `overwriteOngoingExecution: false` to reuse an ongoing execution (deduplication).
     */
    revalidate: (options?: { overwriteOngoingExecution?: boolean }) => Promise<TState>;

    /**
     * Marks the query as invalidated and optionally triggers re-execution.
     *
     * @param options - Invalidation options
     * @param options.overwriteOngoingExecution - Whether to overwrite an ongoing execution (default: `true`)
     *
     * @returns `true` if execution was triggered, `false` otherwise
     *
     * @remarks
     * - Invalidated queries are treated as stale regardless of `staleTime`.
     * - The next `revalidate` will always execute until a successful result clears the invalidation.
     * - If there are active subscribers: Execution is triggered immediately.
     * - Otherwise: The query remains invalidated and will execute on the next revalidation.
     * - By default, starts a new execution even if one is already in progress.
     * - Set `overwriteOngoingExecution: false` to reuse an ongoing execution (deduplication).
     */
    invalidate: (options?: { overwriteOngoingExecution?: boolean }) => boolean;

    /**
     * Resets the query state to its initial state.
     *
     * @remarks
     * - Cancels retry logic and ignores any ongoing execution results.
     */
    reset: () => void;

    /**
     * Deletes the query store for the current variable.
     *
     * @returns `true` if deleted, `false` otherwise
     *
     * @remarks
     * - Cannot delete while there are active subscribers.
     */
    delete: () => boolean;

    /**
     * Performs an optimistic update on the query data.
     *
     * @param data - Optimistic data to set
     *
     * @returns Controls for managing the optimistic update
     *
     * @remarks
     * - Temporarily replaces the current data.
     * - Stores previous data for rollback.
     * - Commonly used with mutations for instant UI updates.
     *
     * @example
     * const { rollback, revalidate } = query.optimisticUpdate(newData);
     */
    optimisticUpdate: (data: TData) => {
      revalidate: () => Promise<TState>;
      rollback: () => TData;
    };

    /**
     * Restores the data before the last optimistic update.
     *
     * @returns The restored data
     *
     * @remarks
     * - Should be used if an optimistic update fails.
     */
    rollbackOptimisticUpdate: () => TData;
  };
  const internals = new WeakMap<TStore, Internal>();

  const configureInternals = (store: TStore, variable: TVariable): Internal => ({
    metadata: {},
    setInitialData: (data, revalidate = false) => {
      const state = store.getState();
      if (state.state === "INITIAL" && state.data === undefined) {
        const { metadata } = internals.get(store)!;
        if (revalidate) metadata.isInvalidated = true;
        store.setState({
          state: "SUCCESS",
          isSuccess: true,
          data,
          dataUpdatedAt: Date.now(),
        });
        return true;
      }
      return false;
    },
    execute: ({ overwriteOngoingExecution = true } = {}) => {
      return execute(store, variable, overwriteOngoingExecution);
    },
    revalidate: ({ overwriteOngoingExecution = true } = {}) => {
      return revalidate(store, variable, overwriteOngoingExecution);
    },
    invalidate: (options) => {
      const { metadata } = internals.get(store)!;
      metadata.isInvalidated = true;
      if (store.getSubscribers().size > 0) {
        internals.get(store)!.execute(options);
        return true;
      }
      return false;
    },
    reset: () => {
      const { metadata } = internals.get(store)!;
      clearTimeout(metadata.retryTimeoutId);
      if (metadata.retryResolver || metadata.promiseResolver) {
        console.debug(
          "Ongoing query execution was ignored due to reset(). The result will not update the store state.",
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
          "Cannot delete query store while it still has active subscribers. Unsubscribe all listeners before deleting the store.",
        );
        return false;
      }
      internals.get(store)!.reset();
      return stores.delete(store.variableHash);
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

  const execute = async (store: TStore, variable: TVariable, overwriteOngoingExecution = false) => {
    const { metadata } = internals.get(store)!;
    if (!overwriteOngoingExecution && metadata.promise) return metadata.promise;
    clearTimeout(metadata.retryTimeoutId);

    const createPromise = () => {
      const promise = new Promise<TState>((resolve) => {
        metadata.promiseResolver = resolve;
        const stateBeforeExecute = store.getState();
        store.setState({
          isPending: true,
          isRevalidating: stateBeforeExecute.state === "SUCCESS",
          willRetryAt: undefined,
          isRetrying: !!metadata.retryResolver,
          retryCount: metadata.retryResolver ? stateBeforeExecute.retryCount + 1 : 0,
        });
        queryFn(variable, stateBeforeExecute, store.variableHash)
          .then((data) => {
            if (data === undefined) {
              console.error(
                "Query function returned undefined. Successful responses must not be undefined.",
              );
            }
            if (!metadata.promiseResolver) return; // Handle reset: should ignore ongoing execution
            if (promise !== metadata.promise) return resolve(metadata.promise!); // Handle overwriteOngoingExecution
            const now = Date.now();
            store.setState({
              isPending: false,
              isRevalidating: false,
              isRetrying: false,
              retryCount: 0,
              state: "SUCCESS",
              isSuccess: true,
              isError: false,
              data,
              dataUpdatedAt: now,
              dataStaleAt: now + staleTime,
              error: undefined,
              errorUpdatedAt: undefined,
            });
            metadata.isInvalidated = false;
            metadata.rollbackData = data;
            resolve(store.getState());
            metadata.retryResolver?.(store.getState());
            metadata.retryResolver = undefined;
            onSuccess(data, variable, stateBeforeExecute);
            onSettled(variable, stateBeforeExecute);
          })
          .catch((error) => {
            if (!metadata.promiseResolver && !metadata.retryResolver) return; // Handle reset: should ignore ongoing execution
            if (promise !== metadata.promise) return resolve(metadata.promise!); // Handle overwriteOngoingExecution
            const nextState = {
              ...store.getState(),
              isPending: false,
              isRevalidating: false,
              isRetrying: false,
            };
            const [shouldRetry, retryDelay] = shouldRetryFn(error, nextState);
            const hasSubscriber = store.getSubscribers().size > 0;
            if (shouldRetry && hasSubscriber) {
              metadata.retryResolver = resolve;
              metadata.retryTimeoutId = setTimeout(createPromise, retryDelay);
              store.setState({
                isPending: false,
                isRevalidating: false,
                isRetrying: false,
                willRetryAt: Date.now() + retryDelay,
              });
            } else {
              store.setState({
                isPending: false,
                isRevalidating: false,
                isRetrying: false,
                retryCount: 0,
                error,
                errorUpdatedAt: Date.now(),
                ...(store.getState().data
                  ? {
                      state: "SUCCESS_BUT_REVALIDATION_ERROR",
                      isError: false,
                    }
                  : {
                      state: "ERROR",
                      isError: true,
                    }),
              });
              const state = store.getState();
              resolve(state);
              metadata.retryResolver?.(state);
              metadata.retryResolver = undefined;
              if (onError) onError(error, variable, stateBeforeExecute);
              else console.error(state);
              onSettled(variable, stateBeforeExecute);
            }
          })
          .finally(() => {
            if (metadata.promise === promise) {
              metadata.promise = undefined;
              metadata.promiseResolver = undefined;
            }
          });
      });
      metadata.promise = promise;
      return promise;
    };
    return createPromise();
  };

  const revalidate = async (
    store: TStore,
    variable: TVariable,
    overwriteOngoingExecution?: boolean,
  ) => {
    const { metadata } = internals.get(store)!;
    if (!overwriteOngoingExecution && metadata.promise) return metadata.promise;
    const state = store.getState();
    if (state.dataUpdatedAt) {
      const isFresh = state.dataUpdatedAt + staleTime > Date.now();
      if (isFresh && !metadata.isInvalidated) return state;
    }
    return execute(store, variable, overwriteOngoingExecution);
  };

  // -------

  const getStore = (variable: TVariable = {} as TVariable) => {
    const variableHash = getHash(variable);
    let store: TStore;
    if (stores.has(variableHash)) {
      store = stores.get(variableHash)!;
    } else {
      store = initStore(
        initialState,
        configureStoreEvents(variableHash) as any, // Intentionally using as any: don't want to add generic on `initStore`
      ) as TStore;
      store.variableHash = variableHash;
      stores.set(variableHash, store);
      internals.set(store, configureInternals(store, variable));
    }

    type UseQueryStoreOptions = {
      /**
       * Whether the query should be ravalidated automatically on mount.
       *
       * Revalidate means execute the queryFn **if stale/invalidated**.
       *
       * @default true
       */
      revalidateOnMount?: boolean;

      /**
       * Whether to keep previous successful data while a new variable is loading.
       *
       * @remarks
       * - Only applies when the query is in the `INITIAL` state (no data & no error).
       * - Intended for variable changes:
       *   when switching from one variable to another, the previous data is temporarily shown
       *   while the new execution is in progress.
       * - Once the new execution resolves (success or error), the previous data is no longer used.
       * - Prevents UI flicker (e.g. empty/loading state) during transitions.
       *
       * @example
       * // Switching from userId=1 → userId=2
       * // While loading userId=2, still show userId=1 data
       * useQuery({ id: userId }, { keepPreviousData: true });
       */ keepPreviousData?: boolean;
    } & (
      | {
          /**
           * Initial data used on first render (and will also update the store state right after that)
           *
           * If provided, `initialData` will be applied **once per query-store instance**
           */
          initialData: TData;

          /**
           * Whether the provided `initialData` should be treated as stale.
           *
           * @remarks
           * - If `true`, a revalidation (refetch) will be triggered immediately.
           * - If `false` (default), `initialData` is treated as fresh and will not be revalidated.
           *
           * @default false
           *
           * @example
           * useQuery({
           *   initialData: dataFromSSR,
           *   initialDataIsStale: true, // force refetch
           * });
           */
          initialDataIsStale?: boolean;
        }
      | {
          initialData?: never;
          initialDataIsStale?: never;
        }
    );

    /**
     * React hook for subscribing to query state.
     *
     * @param options - Hook behavior configuration
     *
     * @returns Query state (Proxy-wrapped for access tracking)
     *
     * @remarks
     * - Automatically executes the query on mount (unless disabled).
     * - Components automatically subscribe to the properties they access.
     *
     * @example
     * const state = useQuery();
     * // Subscribes to accessed properties
     *
     * @example
     * const { data } = useQuery();
     * // Subscribes to `data`
     *
     * @example
     * const { name } = useQuery().data.user;
     * // Subscribes to `data.user.name`
     */
    const useStore = (options: UseQueryStoreOptions = {}): TState => {
      const {
        initialData = NO_INITIAL_VALUE as TData,
        initialDataIsStale = false,
        revalidateOnMount = true,
        keepPreviousData,
      } = options;

      const [storeState, initialDataInitiatedAt] = useStoreStateWithInitializer(
        store,
        initialData === NO_INITIAL_VALUE
          ? undefined
          : {
              state: "SUCCESS",
              isSuccess: true,
              data: initialData,
            },
      );
      const prevState = useRef<Partial<TState>>({});

      let storeStateToBeUsed = storeState;
      if (storeState.state !== "INITIAL") {
        prevState.current = {
          data: storeState.data,
          dataUpdatedAt: storeState.dataUpdatedAt,
        } as Partial<TState>;
      } else if (keepPreviousData) {
        storeStateToBeUsed = { ...storeState, ...prevState.current } as TState;
      }

      const [trackedState, usedPathsRef] = useStoreStateProxy(
        revalidateOnMount && storeState.state === "INITIAL"
          ? // Optimize rendering on initial state
            // Do { isPending: true } → result
            // instead of { isPending: false } → { isPending: true } → result
            { ...storeStateToBeUsed, isPending: true }
          : storeStateToBeUsed,
      );

      const [, reRender] = useState({});

      useIsomorphicLayoutEffect(() => {
        return store.subscribe((nextState, prevState, changedKeys) => {
          if (prevState.state === "INITIAL" && !prevState.isPending && nextState.isPending) {
            // Prevent unnecessary re-render since the isPending already true on initial render
            return;
          }
          const paths = compressPaths(usedPathsRef.current);
          for (const path of paths) {
            const rootKey = path[0] as keyof TState;
            if (!changedKeys.includes(rootKey)) continue;
            const prevVal = getValueByPath(prevState, path);
            const nextVal = getValueByPath(nextState, path);
            if (!Object.is(prevVal, nextVal)) return reRender({});
          }
        });
      }, [store]);

      // Execute queryFn on mount & on re-render
      useIsomorphicLayoutEffect(() => {
        if (revalidateOnMount !== false) {
          if (!initialDataIsStale) {
            const dataInitiatedAt = initialDataInitiatedAt.current.get(store);
            if (dataInitiatedAt && dataInitiatedAt + staleTime > Date.now()) {
              // Prevent immediate revalidation when initialData is set
              return;
            }
          }
          revalidate(store, variable, false);
        }
      }, [store, revalidateOnMount, initialDataIsStale]);

      if (keepPreviousData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        !!trackedState.error; // Force subscribe to error
      }

      return trackedState;
    };

    return Object.assign(useStore, {
      subscribe: store.subscribe,
      getSubscribers: store.getSubscribers,
      getState: store.getState,
      setState: (value: SetState<TState>) => {
        console.debug("Manual setState (not via provided actions) on query store");
        store.setState(value);
      },
      ...internals.get(store)!,
      variableHash,
    });
  };

  return Object.assign(getStore, {
    /**
     * Executes all query instances.
     *
     * @remarks
     * - Useful for bulk refetching.
     */
    executeAll: (options?: { overwriteOngoingExecution?: boolean }) => {
      stores.forEach((store) => internals.get(store)!.execute(options));
    },

    /**
     * Revalidates all query instances.
     *
     * @remarks
     * - Only re-fetches stale queries.
     */
    revalidateAll: (options?: { overwriteOngoingExecution?: boolean }) => {
      stores.forEach((store) => internals.get(store)!.revalidate(options));
    },

    /**
     * Invalidates all query instances.
     *
     * @remarks
     * - Marks all queries as invalidated and triggers revalidation if active.
     * - Invalidated queries bypass `staleTime` until successfully executed again.
     */
    invalidateAll: (options?: { overwriteOngoingExecution?: boolean }) => {
      stores.forEach((store) => internals.get(store)!.invalidate(options));
    },

    /**
     * Resets all query instances.
     */
    resetAll: () => {
      stores.forEach((store) => internals.get(store)!.reset());
    },
  });
};

let focusListenersAdded = false;
const focusListeners = new Set<() => void>();
const onWindowFocus = () => [...focusListeners].forEach((fn) => fn());

let onlineListenersAdded = false;
const onlineListeners = new Set<() => void>();
const onWindowOnline = () => [...onlineListeners].forEach((fn) => fn());
