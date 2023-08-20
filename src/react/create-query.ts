import { identityFn, noop } from '../utils';
import { createStores, CreateStoresOptions, StoreKey } from './create-stores';

const getDecision = <T>(
  value: boolean | 'always' | ((param: T) => boolean | 'always'),
  param: T,
  { ifTrue, ifAlways }: { ifTrue: () => void; ifAlways: () => void },
) => {
  if (value === true || (typeof value === 'function' && value(param) === true)) {
    ifTrue();
  } else if (value === 'always' || (typeof value === 'function' && value(param) === 'always')) {
    ifAlways();
  }
};

const DEFAULT_STALE_TIME = 3_000; // 3 seconds

export type QueryStatus = 'loading' | 'success' | 'error';

const INITIAL_QUERY_STATE = {
  isWaiting: false, // Network fetching
  isWaitingNextPage: false,
  status: 'loading' as QueryStatus,
  isLoading: true,
  isSuccess: false,
  isError: false,
  isRefetching: false,
  isRefetchError: false,
  isPreviousData: false,
  data: null,
  response: null,
  responseUpdatedAt: null,
  error: null,
  errorUpdatedAt: null,
  retryCount: 0,
  isGoingToRetry: false,
  pageParam: undefined,
  pageParams: [undefined],
  hasNextPage: false,
};

export type QueryState<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
> = {
  /**
   * Query store key, an object that will be hashed into a string as a query store identifier.
   */
  key: TKey;
  /**
   * Will only be called if the data is stale or empty.
   */
  fetch: () => void;
  /**
   * Will be called even if the data is still fresh (not stale).
   */
  forceFetch: () => void;
  /**
   * Fetch next page if has next page.
   *
   * If the data is empty, it will just fetch the first page.
   *
   * You can ignore this if your query is not paginated.
   */
  fetchNextPage: () => void;
  markAsStale: () => void;
  reset: () => void;
  /**
   * Set query response & data.
   */
  setResponse: (
    responseSetter: TResponse | ((state: QueryState<TKey, TResponse, TData, TError>) => TResponse),
  ) => void;
  helpers: {
    /**
     * Fetch all active queries.
     *
     * Same as `fetch` method, this will only be called if the data is stale or empty.
     */
    fetchAllActiveQueries: () => void;
    /**
     * Fetch all active queries.
     *
     * Same as `fetch` method, this will only be called if the data is stale or empty.
     */
    forceFetchAllActiveQueries: () => void;
    /**
     * Delete query data for all query keys.
     */
    resetAllQueries: () => void;
  };
  /**
   * Network fetching status.
   */
  isWaiting: boolean;
  /**
   * Network fetching status for fetching next page.
   */
  isWaitingNextPage: boolean;
  /**
   * Status of the data.
   *
   * `"loading"` = no data.
   *
   * `"success"` = has data.
   *
   * `"error"` = has error.
   *
   * It has no relation with network fetching state.
   * If you're looking for network fetching state, use `isWaiting` instead.
   */
  status: QueryStatus;
  /**
   * Data state, will be `true` if the query has no data.
   *
   * It has no relation with network fetching state.
   * If you're looking for network fetching state, use `isWaiting` instead.
   */
  isLoading: boolean;
  /**
   * Data state, will be `true` if the query has a data.
   */
  isSuccess: boolean;
  /**
   * Error state, will be `true` after data fetching error.
   */
  isError: boolean;
  isRefetching: boolean;
  isRefetchError: boolean;
  isPreviousData: boolean;
  data: TData | null;
  response: TResponse | null;
  responseUpdatedAt: number | null;
  error: TError | null;
  errorUpdatedAt: number | null;
  retryCount: number;
  isGoingToRetry: boolean;
  pageParam: any;
  pageParams: any[];
  hasNextPage: boolean;
};

export type CreateQueryOptions<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
> = CreateStoresOptions<TKey, QueryState<TKey, TResponse, TData, TError>> & {
  select?: (
    response: TResponse,
    state: Pick<QueryState<TKey, TResponse, TData, TError>, 'data' | 'key'>,
  ) => TData;
  /**
   * Stale time in miliseconds.
   *
   * Defaults to `3000` (3 seconds).
   */
  staleTime?: number;
  /**
   * Number of maximum retries.
   *
   * Defaults to `1`.
   */
  retry?: number;
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
   * Defaults to `true`.
   *
   * - If set to `true`, the query will be called on window focus **if the data is stale**.
   * - If set to `false`, the query won't be called on window focus.
   * - If set to `"always"`, the query will be called on window focus.
   */
  fetchOnWindowFocus?: boolean | 'always' | ((key: TKey) => boolean | 'always');
  /**
   * If set to `false` or return `false`, the query won't be called in any condition.
   * Auto fetch on mount will be disabled.
   * Manually trigger `fetch` method (returned from `createQuery`) won't work too.
   *
   * Defaults to `true`.
   */
  enabled?: boolean | ((key: TKey) => boolean);
  /**
   * If set to `true`, previous `data` will be kept when fetching new data because the query key changed.
   *
   * This will only happened if there is no `data` in the next query.
   */
  keepPreviousData?: boolean;
  /**
   * Only set this if you have an infinite query.
   *
   * This function should return a variable that will be used when fetching next page (`pageParam`).
   */
  getNextPageParam?: (lastPage: TResponse, index: number) => any;
  onSuccess?: (
    response: TResponse,
    stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError>,
  ) => void;
  onError?: (
    error: TError,
    stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError>,
  ) => void;
  onSettled?: (stateBeforeCallQuery: QueryState<TKey, TResponse, TData, TError>) => void;
};

const useQueryDefaultDeps = (state: QueryState<any>) => [
  state.data,
  state.error,
  state.isWaitingNextPage,
  state.hasNextPage,
];

export const createQuery = <
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
>(
  queryFn: (key: TKey, state: QueryState<TKey, TResponse, TData, TError>) => Promise<TResponse>,
  options: CreateQueryOptions<TKey, TResponse, TData, TError> = {},
) => {
  const {
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onLastUnsubscribe = noop,
    onBeforeChangeKey = noop,
    defaultDeps = useQueryDefaultDeps,
    select = identityFn as (response: TResponse) => TData,
    staleTime = DEFAULT_STALE_TIME,
    retry = 1,
    fetchOnMount = true,
    fetchOnWindowFocus = true,
    enabled = true,
    keepPreviousData,
    getNextPageParam = () => undefined,
    onSuccess = noop,
    onError = noop,
    onSettled = noop,
    ...createStoresOptions
  } = options;

  const useQuery = createStores<TKey, QueryState<TKey, TResponse, TData, TError>>(
    ({ key: _key, get, set }) => {
      const key = _key as TKey;

      const forceFetch = () => {
        const responseAllPages: TResponse[] = [];
        const newPageParams: any[] = [undefined];
        let pageParam: any = undefined;

        const { isWaiting, isLoading, isGoingToRetry, pageParams } = get();
        if (isWaiting || enabled === false || (typeof enabled === 'function' && !enabled(key)))
          return;

        if (isLoading) set({ isWaiting: true });
        else set({ isWaiting: true, isRefetching: true });

        const callQuery = () => {
          if (isGoingToRetry) {
            if (isLoading) set({ isGoingToRetry: false, isWaiting: true });
            else set({ isGoingToRetry: false, isWaiting: true, isRefetching: true });
          }
          const stateBeforeCallQuery = { ...get(), pageParam };
          queryFn(key, stateBeforeCallQuery)
            .then((response) => {
              responseAllPages.push(response);
              const newPageParam = getNextPageParam(response, responseAllPages.length);
              newPageParams.push(newPageParam);
              if (newPageParam !== undefined && newPageParams.length < pageParams.length) {
                pageParam = newPageParam;
                callQuery();
                return;
              }
              set({
                isWaiting: false,
                status: 'success',
                isLoading: false,
                isSuccess: true,
                isError: false,
                isRefetching: false,
                isRefetchError: false,
                isPreviousData: false,
                data: responseAllPages.reduce(
                  (prev, response) => {
                    return select(response, { key, data: prev });
                  },
                  null as TData | null,
                ),
                response,
                responseUpdatedAt: Date.now(),
                error: null,
                errorUpdatedAt: null,
                retryCount: 0,
                pageParam: newPageParam,
                pageParams: newPageParams,
                hasNextPage: newPageParam !== undefined,
              });
              onSuccess(response, stateBeforeCallQuery);
            })
            .catch((error: TError) => {
              const prevState = get();
              const errorUpdatedAt = Date.now();
              set(
                prevState.isSuccess
                  ? {
                      isWaiting: false,
                      isRefetching: false,
                      isRefetchError: true,
                      data: responseAllPages.reduce(
                        (prev, response) => {
                          return select(response, { key, data: prev });
                        },
                        null as TData | null,
                      ),
                      error,
                      errorUpdatedAt,
                      pageParam,
                      hasNextPage: pageParam !== undefined,
                    }
                  : {
                      isWaiting: false,
                      isError: true,
                      error,
                      errorUpdatedAt,
                      pageParam,
                      hasNextPage: pageParam !== undefined,
                    },
              );
              if (prevState.retryCount < retry) {
                set({ retryCount: prevState.retryCount + 1, isGoingToRetry: true });
                callQuery();
              }
              onError(error, stateBeforeCallQuery);
            })
            .finally(() => {
              onSettled(stateBeforeCallQuery);
            });
        };

        callQuery();
      };

      const fetch = () => {
        const { responseUpdatedAt } = get();
        const isStale = Date.now() > Number(responseUpdatedAt) + staleTime;
        if (!isStale) return;
        forceFetch();
      };

      const fetchNextPage = () => {
        const state = get();
        const { isLoading, isWaitingNextPage, data, hasNextPage, pageParam, pageParams } = state;

        if (isLoading) return forceFetch();
        if (isWaitingNextPage || !hasNextPage) return;

        set({ isWaitingNextPage: true });
        queryFn(key, { ...state, pageParam })
          .then((response) => {
            const newPageParam = getNextPageParam(response, pageParams.length);
            set({
              isWaitingNextPage: false,
              response,
              responseUpdatedAt: Date.now(),
              data: select(response, { key, data }),
              pageParam: newPageParam,
              pageParams: pageParams.concat(newPageParam),
              hasNextPage: newPageParam !== undefined,
            });
          })
          .catch((error: TError) => {
            set({
              isWaitingNextPage: false,
              isError: true,
              error,
              errorUpdatedAt: Date.now(),
            });
          });
      };

      const setResponse = (
        responseSetter:
          | TResponse
          | ((state: QueryState<TKey, TResponse, TData, TError>) => TResponse),
      ) => {
        if (responseSetter === undefined) return;
        const store = useQuery.get(key);
        const response: TResponse =
          typeof responseSetter === 'function'
            ? (responseSetter as (state: QueryState<TKey, TResponse, TData, TError>) => TResponse)(
                store,
              )
            : responseSetter;
        useQuery.set(key, {
          status: 'success',
          isLoading: false,
          isSuccess: true,
          isError: false,
          response,
          responseUpdatedAt: Date.now(),
          data: select(response, { key, data: store.data }),
        });
      };

      const fetchAllActiveQueries = () => {
        useQuery.getAllWithSubscriber().forEach((state) => {
          state.fetch();
        });
      };

      const forceFetchAllActiveQueries = () => {
        useQuery.getAllWithSubscriber().forEach((state) => {
          state.forceFetch();
        });
      };

      const resetAllQueries = () => {
        useQuery.getAll().forEach((state) => {
          state.reset();
        });
      };

      return {
        ...INITIAL_QUERY_STATE,
        key,
        fetch,
        forceFetch,
        fetchNextPage,
        markAsStale: () => set({ responseUpdatedAt: null }),
        reset: () => set(INITIAL_QUERY_STATE),
        setResponse,
        helpers: {
          fetchAllActiveQueries,
          forceFetchAllActiveQueries,
          resetAllQueries,
        },
      };
    },
    (() => {
      const resetRetryCount = (key: TKey) => {
        useQuery.set(key, { retryCount: 0 }, true);
      };

      const fetchWindowFocusHandler = () => {
        useQuery.getAllWithSubscriber().forEach((state) => {
          getDecision(fetchOnWindowFocus, state.key, {
            ifTrue: state.fetch,
            ifAlways: state.forceFetch,
          });
        });
      };

      return {
        ...createStoresOptions,
        defaultDeps,
        onFirstSubscribe: (state) => {
          if (typeof window !== 'undefined' && fetchOnWindowFocus) {
            window.addEventListener('focus', fetchWindowFocusHandler);
          }
          onFirstSubscribe(state);
        },
        onSubscribe: (state) => {
          getDecision(fetchOnMount, state.key, {
            ifTrue: state.fetch,
            ifAlways: state.forceFetch,
          });
          onSubscribe(state);
        },
        onLastUnsubscribe: (state) => {
          if (typeof window !== 'undefined' && fetchOnWindowFocus) {
            window.addEventListener('focus', fetchWindowFocusHandler);
          }
          resetRetryCount(state.key);
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
                    data: prevData.data,
                    response: prevData.response,
                    isLoading: false,
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
  );

  return useQuery;
};
