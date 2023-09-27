import { createElement, FunctionComponent, useState } from 'react';

import { getValueOrComputedValue, hasValue, identityFn, isClient, Maybe, noop } from '../utils';
import { createStores, CreateStoresOptions, StoreKey, UseStores } from './create-stores';

const INITIAL_QUERY_STATE = {
  isWaiting: false, // Network fetching
  isWaitingNextPage: false,
  status: 'loading' as 'loading',
  isLoading: true as true,
  isSuccess: false as false,
  isError: false as false,
  isRefetching: false,
  isRefetchError: false,
  isPreviousData: false,
  isOptimisticData: false,
  data: undefined,
  response: undefined,
  responseUpdatedAt: undefined,
  error: undefined,
  errorUpdatedAt: undefined,
  retryCount: 0,
  isGoingToRetry: false,
  pageParam: undefined,
  pageParams: [undefined],
  hasNextPage: false,
  retryNextPageCount: 0,
  isGoingToRetryNextPage: false,
};

export type QueryState<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
  TPageParam = any,
> = {
  /**
   * Query store key, an object that will be hashed into a string as a query store identifier.
   */
  key: TKey;
  /**
   * Query store key hash, a string used as a query store identifier.
   */
  keyHash: string;
  /**
   * Will only be called if the data is stale or empty.
   */
  fetch: () => void;
  /**
   * Will be called even if the data is still fresh (not stale).
   *
   * @returns Promise that will always get resolved.
   */
  forceFetch: () => Promise<QueryState<TKey, TResponse, TData, TError, TPageParam>>;
  /**
   * Fetch next page if has next page.
   *
   * If the data is empty, it will just fetch the first page.
   *
   * You can ignore this if your query is not an infinite query.
   *
   * @returns Promise that will always get resolved.
   */
  fetchNextPage: () => Promise<QueryState<TKey, TResponse, TData, TError, TPageParam>>;
  /**
   * Set query state (data, error, etc) to initial state.
   */
  reset: () => void;
  /**
   * Optimistic update.
   *
   * @returns function to revert the changes & function to invalidate the query
   *
   * IMPORTANT NOTE: This won't work well on infinite query.
   */
  optimisticUpdate: (
    response:
      | TResponse
      | ((prevState: QueryState<TKey, TResponse, TData, TError, TPageParam>) => TResponse),
  ) => { revert: () => void; invalidate: () => void };
  /**
   * Network fetching status.
   */
  isWaiting: boolean;
  /**
   * Network fetching status for fetching next page.
   */
  isWaitingNextPage: boolean;
  isRefetching: boolean;
  isRefetchError: boolean;
  /**
   * Will be `true` if the response/data comes from the previous query key.
   *
   * @see `keepPreviousData` option
   */
  isPreviousData: boolean;
  isOptimisticData: boolean;
  error: TError | undefined;
  errorUpdatedAt: number | undefined;
  retryCount: number;
  isGoingToRetry: boolean;
  pageParam: Maybe<TPageParam>;
  pageParams: Maybe<TPageParam>[];
  hasNextPage: boolean;
  retryNextPageCount: number;
  isGoingToRetryNextPage: boolean;
} & (
  | {
      /**
       * Status of the data.
       *
       * `"loading"` = no data.
       *
       * `"success"` = has data.
       *
       * `"error"` = has error and no data.
       *
       * It has no relation with network fetching state.
       * If you're looking for network fetching state, use `isWaiting` instead.
       *
       * @see https://floppy-disk.vercel.app/docs/query/introduction#query-state--network-fetching-state
       */
      status: 'loading';
      /**
       * Data state, will be `true` if the query has no data.
       *
       * It has no relation with network fetching state.
       * If you're looking for network fetching state, use `isWaiting` instead.
       *
       * @see https://floppy-disk.vercel.app/docs/query/introduction#query-state--network-fetching-state
       */
      isLoading: true;
      /**
       * Data state, will be `true` if the query has a data.
       */
      isSuccess: false;
      /**
       * Error state, will be `true` if the query has no data but has an error.
       *
       * This will only happened if an error occured after first fetch.
       *
       * If data fetched successfully but then an error occured, `isError` will be `false` but `isRefetchError` will be `true`.
       */
      isError: false;
      data: undefined;
      response: undefined;
      responseUpdatedAt: undefined;
    }
  | {
      status: 'success';
      isLoading: false;
      isSuccess: true;
      isError: false;
      data: TData;
      response: TResponse;
      responseUpdatedAt: number | undefined; // Allow undefined to make setInitialResponse's data stale, and a revalidation will be triggered
    }
  | {
      status: 'error';
      isLoading: false;
      isSuccess: false;
      isError: true;
      data: undefined;
      response: undefined;
      responseUpdatedAt: undefined;
    }
);

export type CreateQueryOptions<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
  TPageParam = any,
> = CreateStoresOptions<TKey, QueryState<TKey, TResponse, TData, TError, TPageParam>> & {
  select?: (
    response: TResponse,
    state: Pick<QueryState<TKey, TResponse, TData, TError, TPageParam>, 'data' | 'key'>,
  ) => TData;
  /**
   * Stale time in miliseconds.
   *
   * Defaults to `3000` (3 seconds).
   */
  staleTime?: number;
  /**
   * Auto call the query when the component is mounted.
   *
   * Defaults to `true`.
   *
   * - If set to `true`, the query will be called on mount focus **if the data is stale**.
   * - If set to `false`, the query won't be called on mount focus.
   * - If set to `"always"`, the query will be called on mount focus.
   */
  fetchOnMount?: boolean | 'always' | ((key: TKey) => boolean | 'always');
  /**
   * Defaults to follow the value of `fetchOnMount`.
   *
   * `fetchOnMount` and `fetchOnWindowFocus` can be set to different values.
   * However, if `fetchOnWindowFocus` is not explicitly set, it will mimic the value of `fetchOnMount`.
   *
   * - If set to `true`, the query will be called on window focus **if the data is stale**.
   * - If set to `false`, the query won't be called on window focus.
   * - If set to `"always"`, the query will be called on window focus.
   */
  fetchOnWindowFocus?: boolean | 'always' | ((key: TKey) => boolean | 'always');
  /**
   * Defaults to follow the value of `fetchOnMount`.
   *
   * `fetchOnMount` and `fetchOnReconnect` can be set to different values.
   * However, if `fetchOnReconnect` is not explicitly set, it will mimic the value of `fetchOnMount`.
   *
   * - If set to `true`, the query will be called on window focus **if the data is stale**.
   * - If set to `false`, the query won't be called on window focus.
   * - If set to `"always"`, the query will be called on window focus.
   */
  fetchOnReconnect?: boolean | 'always' | ((key: TKey) => boolean | 'always');
  /**
   * If set to `false` or return `false`, the query won't be called in any condition.
   * Auto fetch on mount will be disabled.
   * Manually trigger `fetch` method (returned from `createQuery`) won't work too.
   *
   * Defaults to `true`.
   */
  enabled?: boolean | ((key: TKey) => boolean);
  /**
   * Number of maximum error retries.
   *
   * Defaults to `1`.
   */
  retry?:
    | number
    | ((
        error: TError,
        prevState: QueryState<TKey, TResponse, TData, TError, TPageParam>,
      ) => number);
  /**
   * Error retry delay in miliseconds.
   *
   * Defaults to `2000` (2 seconds).
   */
  retryDelay?:
    | number
    | ((
        error: TError,
        prevState: QueryState<TKey, TResponse, TData, TError, TPageParam>,
      ) => number);
  /**
   * Used for lagged query.
   *
   * If set to `true`, then:
   * when the query key changed and there is no `data` in the next query key cache,
   * the previous query key cache `data` will be used while fetching new data.
   */
  keepPreviousData?: boolean;
  /**
   * Only set this if you have an infinite query.
   *
   * This function should return a variable that will be stored as `pageParam` that can be used when fetching next page.
   */
  getNextPageParam?: (
    lastPage: TResponse,
    index: number,
    stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError, TPageParam>,
  ) => Maybe<TPageParam>;
  onBeforeFetch?: (
    cancel: () => void,
    state: QueryState<TKey, TResponse, TData, TError, TPageParam>,
  ) => void;
  onSuccess?: (
    response: TResponse,
    stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError, TPageParam>,
  ) => void;
  onError?: (
    error: TError,
    stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError, TPageParam>,
  ) => void;
  onSettled?: (
    stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError, TPageParam>,
  ) => void;
  /**
   * Cache time in miliseconds.
   *
   * When a query becomes inactive (no longer have subscribers), it will be reset after this duration,
   * and the cache data will be garbage collected.
   *
   * Set it to `Infinity` to disable garbage collection.
   *
   * Defaults to `5 * 60 * 1000` (5 minutes).
   */
  cacheTime?: number;
  /**
   * Polling interval in milliseconds.
   *
   * Disabled by default.
   *
   * If last data fetching is failed, the polling interval will be disabled, and it will use `retry` mechanism instead.
   *
   * @see https://floppy-disk.vercel.app/docs/query/polling
   */
  refetchInterval?:
    | number
    | false
    | ((state: QueryState<TKey, TResponse, TData, TError, TPageParam>) => number | false);
};

export type UseQuery<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
  TPageParam = any,
> = UseStores<TKey, QueryState<TKey, TResponse, TData, TError, TPageParam>> & {
  /**
   * Set query's initial response.
   *
   * This is used for server-side rendered page or static page.
   *
   * IMPORTANT NOTE: Put this on the root component or parent component, before any component subscribed!
   */
  setInitialResponse: (options: {
    key?: Maybe<TKey>;
    response: TResponse;
    skipRevalidation?: boolean;
  }) => void;
  /**
   * Set query state (data, error, etc) to initial state.
   */
  reset: () => void;
  /**
   * Set query state (data, error, etc) to initial state.
   */
  resetSpecificKey: (key?: Maybe<TKey>) => void;
  /**
   * Invalidate query means marking a query as stale, and will refetch only if the query is active (has subscriber)
   */
  invalidate: () => void;
  /**
   * Invalidate query means marking a query as stale, and will refetch only if the query is active (has subscriber)
   */
  invalidateSpecificKey: (key?: Maybe<TKey>) => void;
  /**
   * Optimistic update.
   *
   * @returns function to revert the changes & function to invalidate the query
   *
   * IMPORTANT NOTE: This won't work well on infinite query.
   */
  optimisticUpdate: (options: {
    key?: Maybe<TKey>;
    response:
      | TResponse
      | ((prevState: QueryState<TKey, TResponse, TData, TError, TPageParam>) => TResponse);
  }) => { revert: () => void; invalidate: () => void };
  /**
   * Use query with suspense mode.
   */
  suspend: (
    key?: Maybe<TKey>,
  ) => Extract<QueryState<TKey, TResponse, TData, TError, TPageParam>, { status: 'success' }>;
  Render: (props: {
    queryKey?: Maybe<TKey>;
    loading?: FunctionComponent<TKey>;
    success?: FunctionComponent<TKey>;
    error?: FunctionComponent<TKey>;
  }) => JSX.Element;
};

const useQueryDefaultDeps = (state: QueryState<any>) => [
  state.data,
  state.error,
  state.isWaitingNextPage,
  state.hasNextPage,
];

/**
 * @see https://floppy-disk.vercel.app/docs/api#createquery
 */
export const createQuery = <
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
  TPageParam = any,
>(
  queryFn: (
    key: TKey,
    state: QueryState<TKey, TResponse, TData, TError, TPageParam>,
  ) => Promise<TResponse>,
  options: CreateQueryOptions<TKey, TResponse, TData, TError, TPageParam> = {},
): UseQuery<TKey, TResponse, TData, TError, TPageParam> => {
  const defaultFetchOnWindowFocus = options.fetchOnMount ?? true;
  const defaultFetchOnReconnect = options.fetchOnMount ?? true;
  const {
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onLastUnsubscribe = noop,
    onBeforeChangeKey = noop,
    defaultDeps = useQueryDefaultDeps,
    select = identityFn as NonNullable<typeof options.select>,
    staleTime = 3000, // 3 seconds
    fetchOnMount = true,
    fetchOnWindowFocus = defaultFetchOnWindowFocus,
    fetchOnReconnect = defaultFetchOnReconnect,
    enabled = true,
    retry = 1,
    retryDelay = 2000, // 2 seconds
    keepPreviousData,
    getNextPageParam = () => undefined,
    onBeforeFetch = noop,
    onSuccess = noop,
    onError = noop,
    onSettled = noop,
    cacheTime = 5 * 60 * 1000,
    refetchInterval = false,
    ...createStoresOptions
  } = options;

  const retryTimeoutId = new Map<string, number>();
  const retryNextPageTimeoutId = new Map<string, number>();
  const resetTimeoutId = new Map<string, number>();
  const refetchIntervalTimeoutId = new Map<string, number>();

  const preventReplaceResponse = new Map<string, boolean>(); // Prevent optimistic data to be replaced

  const useQuery = createStores<TKey, QueryState<TKey, TResponse, TData, TError, TPageParam>>(
    ({ get, set, key: _key, keyHash }) => {
      const key = _key as TKey;

      const getRetryProps = (error: TError, retryCount: number) => {
        const prevState = get();
        const maxRetryCount = getValueOrComputedValue(retry, error, prevState) || 0;
        const delay = getValueOrComputedValue(retryDelay, error, prevState) || 0;
        return { shouldRetry: retryCount < maxRetryCount, delay };
      };

      const forceFetch = () =>
        new Promise<QueryState<TKey, TResponse, TData, TError, TPageParam>>((resolve) => {
          const state = get();
          const { isWaiting, isLoading, pageParams } = state;

          const responseAllPages: TResponse[] = [];
          const newPageParams: any[] = [pageParams[0]];
          let pageParam: any = pageParams[0];

          clearTimeout(refetchIntervalTimeoutId.get(keyHash));

          if (isWaiting || !getValueOrComputedValue(enabled, key)) return resolve(state);

          let shouldcancel = false;
          const cancel = () => {
            shouldcancel = true;
          };
          onBeforeFetch(cancel, state);
          if (shouldcancel) return resolve(state);

          if (isLoading) set({ isWaiting: true });
          else set({ isWaiting: true, isRefetching: true });

          const callQuery = () => {
            if (get().isGoingToRetry) {
              if (isLoading) set({ isGoingToRetry: false, isWaiting: true });
              else set({ isGoingToRetry: false, isWaiting: true, isRefetching: true });
              clearTimeout(retryTimeoutId.get(keyHash));
            }
            preventReplaceResponse.set(keyHash, false);

            const stateBeforeCallQuery = { ...get(), pageParam };
            queryFn(key, stateBeforeCallQuery)
              .then((response) => {
                if (preventReplaceResponse.get(keyHash)) {
                  set({ isWaiting: false });
                  return resolve(get());
                }
                responseAllPages.push(response);
                const newPageParam = getNextPageParam(
                  response,
                  responseAllPages.length,
                  stateBeforeCallQuery,
                );
                newPageParams.push(newPageParam);
                if (hasValue(newPageParam) && newPageParams.length < pageParams.length) {
                  pageParam = newPageParam;
                  callQuery();
                  return;
                }

                const nextState = {
                  isWaiting: false,
                  status: 'success' as 'success',
                  isLoading: false as false,
                  isSuccess: true as true,
                  isError: false as false,
                  isRefetching: false,
                  isRefetchError: false,
                  isPreviousData: false,
                  isOptimisticData: false,
                  data: responseAllPages.reduce((prev, responseCurrentPage) => {
                    return select(responseCurrentPage, { key, data: prev });
                  }, undefined as TData),
                  response,
                  responseUpdatedAt: Date.now(),
                  error: undefined,
                  errorUpdatedAt: undefined,
                  retryCount: 0,
                  pageParam: newPageParam,
                  pageParams: newPageParams,
                  hasNextPage: hasValue(newPageParam),
                };

                const refetchIntervalValue =
                  isClient && getValueOrComputedValue(refetchInterval, { ...get(), ...nextState });
                if (refetchIntervalValue) {
                  refetchIntervalTimeoutId.set(
                    keyHash,
                    window.setTimeout(() => {
                      forceFetch();
                    }, refetchIntervalValue),
                  );
                }

                set(nextState);
                onSuccess(response, stateBeforeCallQuery);
              })
              .catch((error: TError) => {
                const prevState = get();
                const errorUpdatedAt = Date.now();
                const { shouldRetry, delay } = getRetryProps(error, prevState.retryCount);
                set(
                  prevState.isSuccess && !prevState.isPreviousData
                    ? {
                        isWaiting: false,
                        isRefetching: false,
                        isRefetchError: true,
                        data: responseAllPages.length
                          ? responseAllPages.reduce((prev, response) => {
                              return select(response, { key, data: prev });
                            }, undefined as TData)
                          : prevState.data,
                        error,
                        errorUpdatedAt,
                        isGoingToRetry: shouldRetry,
                        pageParam,
                        hasNextPage: hasValue(pageParam),
                      }
                    : {
                        isWaiting: false,
                        status: 'error',
                        isLoading: false,
                        isError: true,
                        data: undefined,
                        error,
                        errorUpdatedAt,
                        isGoingToRetry: shouldRetry,
                        pageParam,
                        hasNextPage: hasValue(pageParam),
                      },
                );
                if (shouldRetry && isClient) {
                  retryTimeoutId.set(
                    keyHash,
                    window.setTimeout(() => {
                      set({ retryCount: prevState.retryCount + 1 });
                      callQuery();
                    }, delay),
                  );
                }
                onError(error, stateBeforeCallQuery);
              })
              .finally(() => {
                onSettled(stateBeforeCallQuery);
                resolve(get());
              });
          };

          callQuery();
        });

      const fetch = () => {
        const { responseUpdatedAt } = get();
        const isStale = Date.now() > (responseUpdatedAt || 0) + staleTime;
        if (!isStale) return;
        forceFetch();
      };

      const fetchNextPage = () =>
        new Promise<QueryState<TKey, TResponse, TData, TError, TPageParam>>((resolve) => {
          const state = get();
          if (typeof options.getNextPageParam !== 'function') {
            console.warn('fetchNextPage with invalid getNextPageParam option');
            return resolve(state);
          }

          const { isLoading, isWaitingNextPage, data, hasNextPage, pageParam, pageParams } = state;
          if (isLoading) return resolve(forceFetch());
          if (isWaitingNextPage || !hasNextPage) return resolve(state);

          let shouldcancel = false;
          const cancel = () => {
            shouldcancel = true;
          };
          onBeforeFetch(cancel, state);
          if (shouldcancel) return resolve(state);

          set({ isWaitingNextPage: true, isGoingToRetryNextPage: false });
          clearTimeout(retryNextPageTimeoutId.get(keyHash));

          const stateBeforeCallQuery = get();
          queryFn(key, { ...state, pageParam })
            .then((response) => {
              const newPageParam = getNextPageParam(
                response,
                pageParams.length,
                stateBeforeCallQuery,
              );
              set({
                isWaitingNextPage: false,
                response,
                responseUpdatedAt: Date.now(),
                data: select(response, { key, data }),
                pageParam: newPageParam,
                pageParams: pageParams.concat(newPageParam),
                hasNextPage: hasValue(newPageParam),
              });
              onSuccess(response, stateBeforeCallQuery);
            })
            .catch((error: TError) => {
              const prevState = get();
              const { shouldRetry, delay } = getRetryProps(error, prevState.retryNextPageCount);
              set({
                isWaitingNextPage: false,
                isError: true,
                error,
                errorUpdatedAt: Date.now(),
                isGoingToRetryNextPage: shouldRetry,
              });
              if (shouldRetry) {
                retryNextPageTimeoutId.set(
                  keyHash,
                  window.setTimeout(() => {
                    set({ retryNextPageCount: prevState.retryNextPageCount + 1 });
                    fetchNextPage();
                  }, delay),
                );
              }
              onError(error, stateBeforeCallQuery);
            })
            .finally(() => {
              onSettled(stateBeforeCallQuery);
              resolve(get());
            });
        });

      return {
        ...INITIAL_QUERY_STATE,
        key,
        keyHash,
        fetch,
        forceFetch,
        fetchNextPage,
        reset: () => set(INITIAL_QUERY_STATE),
        optimisticUpdate: (response) => useQuery.optimisticUpdate({ key, response }),
      };
    },
    (() => {
      const windowFocusHandler = () => {
        useQuery.getAllWithSubscriber().forEach((state) => {
          const result = getValueOrComputedValue(fetchOnWindowFocus, state.key);
          if (result === 'always') state.forceFetch();
          else if (result) state.fetch();
        });
      };

      const reconnectHandler = () => {
        useQuery.getAllWithSubscriber().forEach((state) => {
          const result = getValueOrComputedValue(fetchOnReconnect, state.key);
          if (result === 'always') state.forceFetch();
          else if (result) state.fetch();
        });
      };

      return {
        ...createStoresOptions,
        defaultDeps,
        onFirstSubscribe: (state) => {
          if (state.isSuccess) {
            const refetchIntervalValue =
              isClient && getValueOrComputedValue(refetchInterval, state);
            if (refetchIntervalValue) {
              refetchIntervalTimeoutId.set(
                state.keyHash,
                window.setTimeout(() => {
                  state.forceFetch();
                }, refetchIntervalValue),
              );
            }
          }
          if (isClient) {
            if (fetchOnWindowFocus) window.addEventListener('focus', windowFocusHandler);
            if (fetchOnReconnect) window.addEventListener('online', reconnectHandler);
          }
          clearTimeout(resetTimeoutId.get(state.keyHash));
          onFirstSubscribe(state);
        },
        onSubscribe: (state) => {
          const result = getValueOrComputedValue(fetchOnMount, state.key);
          if (result === 'always') state.forceFetch();
          else if (result) state.fetch();
          onSubscribe(state);
        },
        onLastUnsubscribe: (state) => {
          const totalSubs = useQuery.getAllWithSubscriber().length;
          if (isClient && totalSubs === 0) {
            if (fetchOnWindowFocus) window.removeEventListener('focus', windowFocusHandler);
            if (fetchOnReconnect) window.removeEventListener('online', reconnectHandler);
          }
          useQuery.set(state.key, { retryCount: 0, retryNextPageCount: 0 }, true);
          clearTimeout(retryTimeoutId.get(state.keyHash));
          clearTimeout(retryNextPageTimeoutId.get(state.keyHash));
          clearTimeout(refetchIntervalTimeoutId.get(state.keyHash));
          if (isClient && cacheTime !== Infinity) {
            resetTimeoutId.set(
              state.keyHash,
              window.setTimeout(() => {
                useQuery.set(state.key, INITIAL_QUERY_STATE);
              }, cacheTime),
            );
          }
          onLastUnsubscribe(state);
        },
        onBeforeChangeKey: (nextKey, prevKey) => {
          if (keepPreviousData) {
            const nextData = useQuery.get(nextKey);
            if (!nextData.data) {
              const prevData = useQuery.get(prevKey);
              if (prevData.data) {
                useQuery.set(
                  nextKey,
                  {
                    status: 'success',
                    isLoading: false,
                    isSuccess: true,
                    isError: false,
                    data: prevData.data,
                    response: prevData.response!,
                    isPreviousData: true,
                  },
                  true,
                );
              }
            }
          }
          onBeforeChangeKey(nextKey, prevKey);
        },
      };
    })(),
  ) as UseQuery<TKey, TResponse, TData, TError, TPageParam>;

  useQuery.setInitialResponse = ({ key, response, skipRevalidation }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      const state = useQuery.get(key);
      if (response === undefined || state.isSuccess) return;
      const newPageParam = getNextPageParam(response, 1, state);
      useQuery.set(key, {
        status: 'success',
        isLoading: false,
        isSuccess: true,
        isError: false,
        response,
        responseUpdatedAt: skipRevalidation ? Date.now() : undefined,
        data: select(response, { key: key as TKey, data: undefined }),
        pageParam: newPageParam,
        pageParams: [undefined, newPageParam],
        hasNextPage: hasValue(newPageParam),
      });
    });
  };

  useQuery.reset = () => {
    useQuery.getStores().forEach((store) => {
      store.set(INITIAL_QUERY_STATE);
    });
  };

  useQuery.resetSpecificKey = (key?: Maybe<TKey>) => {
    const store = useQuery.getStore(key);
    store.set(INITIAL_QUERY_STATE);
  };

  useQuery.invalidate = () => {
    useQuery.getStores().forEach((store) => {
      const { get, set, getSubscribers } = store;
      set({ responseUpdatedAt: undefined });
      if (getSubscribers().size > 0) get().forceFetch();
    });
  };

  useQuery.invalidateSpecificKey = (key?: Maybe<TKey>) => {
    const { get, set, getSubscribers } = useQuery.getStore(key);
    set({ responseUpdatedAt: undefined });
    if (getSubscribers().size > 0) get().forceFetch();
  };

  useQuery.optimisticUpdate = ({ key, response }) => {
    const prevState = useQuery.get(key);
    const optimisticResponse =
      typeof response === 'function'
        ? (
            response as (
              prevState: QueryState<TKey, TResponse, TData, TError, TPageParam>,
            ) => TResponse
          )(prevState)
        : response;
    useQuery.set(key, {
      isOptimisticData: true,
      response: optimisticResponse,
      data: select(optimisticResponse, { key: key as TKey, data: undefined }),
    });
    preventReplaceResponse.set(prevState.keyHash, true);
    const revert = () => {
      useQuery.set(key, {
        isOptimisticData: false,
        response: prevState.response as any,
        data: prevState.data as any,
      });
    };
    const invalidate = () => useQuery.invalidateSpecificKey(key);
    return { revert, invalidate };
  };

  useQuery.suspend = (key?: Maybe<TKey>) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const state = useQuery(key);
    if (state.isLoading) throw state.forceFetch();
    if (state.isError) throw state.error;
    return state;
  };

  const defaultElement: FunctionComponent<TKey> = () => null;
  useQuery.Render = (props) => {
    const {
      queryKey,
      loading = defaultElement,
      success = defaultElement,
      error = defaultElement,
    } = props;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const state = useQuery(queryKey);
    if (state.data) return createElement<any>(success, state.key);
    return createElement<any>(state.isLoading ? loading : error, state.key);
  };

  return useQuery;
};
