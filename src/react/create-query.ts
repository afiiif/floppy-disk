import { identityFn, noop } from '../utils';
import { createStores, CreateStoresOptions, StoreKey } from './create-stores';

const DEFAULT_STALE_TIME = 3_000; // 3 seconds

export type QueryStatus = 'loading' | 'success' | 'error';

const INITIAL_QUERY_STATE = {
  isWaiting: false, // Network fetching
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
};

export type QueryState<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
> = {
  key: TKey;
  fetch: () => void;
  forceFetch: () => void;
  isWaiting: boolean;
  status: QueryStatus;
  isLoading: boolean;
  isSuccess: boolean;
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
};

export type CreateQueryOptions<
  TKey extends StoreKey = StoreKey,
  TResponse = any,
  TData = TResponse,
  TError = unknown,
> = CreateStoresOptions<TKey, QueryState<TKey, TResponse, TData, TError>> & {
  select?: (response: TResponse) => TData;
  staleTime?: number;
  retry?: number;
  fetchOnMount?: boolean | ((key: TKey) => boolean);
  keepPreviousData?: boolean;
  getNextPageParam?: (lastPage: TResponse, index: number) => any;
};

const useQueryDefaultDeps = (state: QueryState<any>) => [state.data, state.error];

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
    onSubscribe = noop,
    onLastUnsubscribe = noop,
    onBeforeChangeKey = noop,
    defaultDeps = useQueryDefaultDeps,
    select = identityFn as (response: TResponse) => TData,
    staleTime = DEFAULT_STALE_TIME,
    retry = 1,
    fetchOnMount = true,
    keepPreviousData,
    ...createStoresOptions
  } = options;

  const useQuery = createStores<TKey, QueryState<TKey, TResponse, TData, TError>>(
    ({ key: _key, get, set }) => {
      const key = _key as TKey;

      const forceFetch = () => {
        const { isWaiting, isLoading, isGoingToRetry } = get();
        if (isWaiting) return;

        if (isLoading) set({ isWaiting: true });
        else set({ isWaiting: true, isRefetching: true });

        const callQuery = () => {
          if (isGoingToRetry) {
            if (isLoading) set({ isGoingToRetry: false, isWaiting: true });
            else set({ isGoingToRetry: false, isWaiting: true, isRefetching: true });
          }

          queryFn(key, get())
            .then((response) => {
              set({
                isWaiting: false,
                status: 'success',
                isLoading: false,
                isSuccess: true,
                isError: false,
                isRefetching: false,
                isRefetchError: false,
                isPreviousData: false,
                data: select(response),
                response,
                responseUpdatedAt: Date.now(),
                error: null,
                errorUpdatedAt: null,
                retryCount: 0,
              });
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
                      error,
                      errorUpdatedAt,
                    }
                  : {
                      isWaiting: false,
                      isError: true,
                      error,
                      errorUpdatedAt,
                    },
              );
              if (prevState.retryCount < retry) {
                set({ retryCount: prevState.retryCount + 1, isGoingToRetry: true });
                callQuery();
              }
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

      return {
        ...INITIAL_QUERY_STATE,
        key,
        fetch,
        forceFetch,
      };
    },
    (() => {
      const resetRetryCount = (key: TKey) => {
        useQuery.set(key, { retryCount: 0 }, true);
      };
      return {
        ...createStoresOptions,
        defaultDeps,
        onSubscribe: (state) => {
          if (
            fetchOnMount === true ||
            (typeof fetchOnMount === 'function' && fetchOnMount(state.key))
          ) {
            state.fetch();
          }
          onSubscribe(state);
        },
        onLastUnsubscribe: (state) => {
          onLastUnsubscribe(state);
          resetRetryCount(state.key);
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
