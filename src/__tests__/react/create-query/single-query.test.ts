import { act, renderHook } from '@testing-library/react-hooks';

import { createQuery, UseQuery } from '../../../react/create-query';

describe('createQuery - single query', () => {
  describe('without param', () => {
    type Key = undefined;
    type Response = { id: number; name: string };
    let useQuery: UseQuery<Key, Response>;

    let queryFn = jest.fn();

    beforeEach(() => {
      queryFn = jest.fn().mockImplementation(async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ id: 1, name: 'test' }), 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn);
    });

    it('should return initial loading state', () => {
      const { result } = renderHook(() => useQuery());
      expect(result.current.status).toBe('loading');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.response).toBe(null);
      expect(result.current.responseUpdatedAt).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.errorUpdatedAt).toBe(null);
    });

    it('should dedupe & update state after successful fetch', async () => {
      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(queryFn).toHaveBeenCalledWith({}, useQuery.get());

      await hook1.waitForNextUpdate();

      const { current } = hook1.result;
      expect(current.status).toBe('success');
      expect(current.isLoading).toBe(false);
      expect(current.isSuccess).toBe(true);
      expect(current.isError).toBe(false);
      expect(current.data).toEqual({ id: 1, name: 'test' });
      expect(current.response).toEqual({ id: 1, name: 'test' });
      expect(current.responseUpdatedAt).not.toBeNull();
      expect(current.error).toBe(null);
      expect(current.errorUpdatedAt).toBe(null);

      expect(hook2.result.current).toBe(current);
    });

    it('should update state after failed fetch', async () => {
      queryFn = jest.fn().mockImplementation(async () => {
        return new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('Test error')), 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn);

      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      await hook1.waitForNextUpdate();

      const { current } = hook1.result;
      expect(current.status).toBe('error');
      expect(current.isLoading).toBe(false);
      expect(current.isSuccess).toBe(false);
      expect(current.isError).toBe(true);
      expect(current.data).toBe(null);
      expect(current.response).toBe(null);
      expect(current.responseUpdatedAt).toBe(null);
      expect(current.error).toEqual(new Error('Test error'));
      expect(current.errorUpdatedAt).not.toBeNull();

      expect(hook2.result.current).toBe(current);
    });

    it('should retry after failed fetch', async () => {
      queryFn = jest.fn().mockImplementation(async () => {
        return new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('Test error')), 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn);

      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      await hook1.waitForNextUpdate();

      expect(hook1.result.current.isError).toBe(true);
      expect(hook2.result.current.isError).toBe(true);

      // Retrying

      await hook1.waitForNextUpdate({ timeout: 2200 });
      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should retry after failed fetch, with custom retry times & delay', async () => {
      let timesCalled = 0;
      queryFn = jest.fn().mockImplementation(async () => {
        // Error x3, then success
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            timesCalled++;
            if (timesCalled < 4) {
              reject(new Error('Test error'));
            } else {
              resolve({ id: 1, name: 'test' });
            }
          }, 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn, { retry: 3, retryDelay: 100 });

      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      expect(hook1.result.current.status).toBe('loading');

      await hook1.waitForNextUpdate();

      expect(hook1.result.current.status).toBe('error');
      expect(hook1.result.current.isError).toBe(true);

      // Retrying

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(2);

      expect(hook1.result.current.status).toBe('error');
      expect(hook1.result.current.isError).toBe(true);

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(3);

      expect(hook1.result.current.status).toBe('error');
      expect(hook1.result.current.isError).toBe(true);

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(4);

      expect(hook1.result.current.status).toBe('success');
      expect(hook1.result.current.isLoading).toBe(false);
      expect(hook1.result.current.isSuccess).toBe(true);
      expect(hook1.result.current.isError).toBe(false);
      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test' });
      expect(hook1.result.current.response).toEqual({ id: 1, name: 'test' });
      expect(hook1.result.current.responseUpdatedAt).not.toBeNull();
      expect(hook1.result.current.error).toBe(null);
      expect(hook1.result.current.errorUpdatedAt).toBe(null);

      expect(hook2.result.current).toBe(hook1.result.current);
    });

    it('should handle refetch error correctly', async () => {
      let timesCalled = 0;
      queryFn = jest.fn().mockImplementation(async () => {
        // Success, then error
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            timesCalled++;
            if (timesCalled > 1) {
              reject(new Error('Test error'));
            } else {
              resolve({ id: 1, name: 'test' });
            }
          }, 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn, { retryDelay: 100 });

      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      await hook1.waitForNextUpdate();

      expect(hook1.result.current.isSuccess).toBe(true);

      act(() => {
        hook1.result.current.forceFetch();
      });

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(2);

      const { current } = hook1.result;
      expect(hook1.result.current.status).toBe('success');
      expect(current.isLoading).toBe(false);
      expect(current.isSuccess).toBe(true);
      expect(current.isError).toBe(false);
      expect(current.isRefetchError).toBe(true);
      expect(current.data).toEqual({ id: 1, name: 'test' });
      expect(current.response).toEqual({ id: 1, name: 'test' });
      expect(current.responseUpdatedAt).not.toBeNull();
      expect(current.error).toEqual(new Error('Test error'));
      expect(current.errorUpdatedAt).not.toBeNull();

      expect(hook2.result.current).toBe(current);

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(3);

      expect(hook1.result.current.status).toBe('success');
      expect(current.isLoading).toBe(false);
      expect(current.isSuccess).toBe(true);
      expect(current.isError).toBe(false);
      expect(current.isRefetchError).toBe(true);
      expect(current.data).toEqual({ id: 1, name: 'test' });
      expect(current.response).toEqual({ id: 1, name: 'test' });
      expect(current.responseUpdatedAt).not.toBeNull();
      expect(current.error).toEqual(new Error('Test error'));
      expect(current.errorUpdatedAt).not.toBeNull();
    });

    it('should handle useQuery methods', async () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const onSettled = jest.fn();

      let timesCalled = 0;
      queryFn = jest.fn().mockImplementation(async () => {
        // Success, then error
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            timesCalled++;
            if (timesCalled > 1) {
              reject(new Error('Test error'));
            } else {
              resolve({ id: 1, name: 'test' });
            }
          }, 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn, {
        onSuccess,
        onError,
        onSettled,
      });

      const hook = renderHook(() => useQuery());
      let state = useQuery.get();

      await hook.waitForNextUpdate();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'test' }, state);
      expect(onError).not.toHaveBeenCalled();
      expect(onSettled).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledWith(state);

      act(() => {
        hook.result.current.fetch();
        hook.result.current.forceFetch();
        hook.result.current.fetch();
        state = useQuery.get();
      });

      await hook.waitForNextUpdate();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSettled).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(new Error('Test error'), state);

      expect(queryFn).toBeCalledTimes(2);
    });

    it('should handle optimistic update correctly', async () => {
      let timesCalled = 0;
      queryFn = jest.fn().mockImplementation(async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            timesCalled++;
            if (timesCalled === 1) {
              resolve({ id: 1, name: 'test' });
            } else {
              resolve({ id: 1, name: 'test 2' });
            }
          }, 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn);

      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      await hook1.waitForNextUpdate();

      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test' });

      act(() => {
        const { revert } = hook1.result.current.optimisticUpdate({
          id: 1,
          name: 'test optmimistic',
        });
        setTimeout(() => {
          revert();
        }, 500);
      });

      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test optmimistic' });
      expect(hook2.result.current.data).toEqual({ id: 1, name: 'test optmimistic' });

      await hook1.waitForNextUpdate();
      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test' });
      expect(hook2.result.current.data).toEqual({ id: 1, name: 'test' });
      expect(queryFn).toHaveBeenCalledTimes(1);

      act(() => {
        hook1.result.current.forceFetch();
        const { invalidate } = hook1.result.current.optimisticUpdate({
          id: 1,
          name: 'test optmimistic 2',
        });
        setTimeout(() => {
          invalidate();
        }, 500);
      });

      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test optmimistic 2' });
      expect(hook2.result.current.data).toEqual({ id: 1, name: 'test optmimistic 2' });
      expect(queryFn).toHaveBeenCalledTimes(2);

      await hook1.waitForNextUpdate();
      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test 2' });
      expect(hook2.result.current.data).toEqual({ id: 1, name: 'test 2' });
      expect(queryFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('with param', () => {
    type Key = { id: number };
    type Response = { id: number; name: string };
    let useQuery: UseQuery<Key, Response, any>;

    let queryFn = jest.fn();

    beforeEach(() => {
      queryFn = jest.fn().mockImplementation(async ({ id }) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const name = ['', 'A', 'B', 'C', 'D'][id];
            resolve({ id, name });
          }, 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn);
    });

    it('should return initial loading state', () => {
      const { result } = renderHook(() => useQuery({ id: 1 }));
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.response).toBe(null);
      expect(result.current.responseUpdatedAt).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.errorUpdatedAt).toBe(null);
    });

    it('should dedupe & update state after successful/error fetch', async () => {
      let timesCalled = 0;
      queryFn = jest.fn().mockImplementation(async ({ id }) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const name = ['', 'A', 'B', 'C'][id];
            if (id === 2) {
              timesCalled++;
              if (timesCalled === 1) {
                reject(new Error('Test error'));
              }
            }
            resolve({ id, name });
          }, 100);
        });
      });
      useQuery = createQuery<Key, Response, string>(queryFn, {
        retryDelay: 100,
        select: (res) => res.name,
      });

      const hook1 = renderHook((props: { id: number }) => useQuery(props), {
        initialProps: { id: 1 },
      });
      const hook2 = renderHook((props: { id: number }) => useQuery(props), {
        initialProps: { id: 1 },
      });
      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(queryFn).toHaveBeenCalledWith({ id: 1 }, useQuery.get({ id: 1 }));

      await hook1.waitForNextUpdate();

      expect(hook1.result.current.isLoading).toBe(false);
      expect(hook1.result.current.isSuccess).toBe(true);
      expect(hook1.result.current.isError).toBe(false);
      expect(hook1.result.current.data).toBe('A');
      expect(hook1.result.current.response).toEqual({ id: 1, name: 'A' });
      expect(hook1.result.current.responseUpdatedAt).not.toBeNull();
      expect(hook1.result.current.error).toBe(null);
      expect(hook1.result.current.errorUpdatedAt).toBe(null);

      expect(hook2.result.current).toBe(hook1.result.current);

      hook2.rerender({ id: 2 });
      expect(hook2.result.current.isLoading).toBe(true);
      expect(hook2.result.current.isSuccess).toBe(false);
      expect(hook2.result.current.isError).toBe(false);
      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(queryFn).toHaveBeenCalledWith({ id: 2 }, useQuery.get({ id: 2 }));

      await hook2.waitForNextUpdate();

      expect(hook2.result.current.isLoading).toBe(false);
      expect(hook2.result.current.isSuccess).toBe(false);
      expect(hook2.result.current.isError).toBe(true);
      expect(hook2.result.current.data).toBe(null);
      expect(hook2.result.current.response).toBe(null);
      expect(hook2.result.current.responseUpdatedAt).toBe(null);
      expect(hook2.result.current.error).toEqual(new Error('Test error'));
      expect(hook2.result.current.errorUpdatedAt).not.toBeNull();

      // Retrying

      await hook2.waitForNextUpdate();

      expect(queryFn).toHaveBeenCalledTimes(3);
      expect(hook2.result.current.isLoading).toBe(false);
      expect(hook2.result.current.isSuccess).toBe(true);
      expect(hook2.result.current.isError).toBe(false);
      expect(hook2.result.current.data).toBe('B');
      expect(hook2.result.current.response).toEqual({ id: 2, name: 'B' });
      expect(hook2.result.current.responseUpdatedAt).not.toBeNull();
      expect(hook2.result.current.error).toBe(null);
      expect(hook2.result.current.errorUpdatedAt).toBe(null);
    });

    it('should handle keepPreviousData correctly', async () => {
      useQuery = createQuery<Key, Response>(queryFn, { keepPreviousData: true });

      const hook = renderHook((props: { id: number }) => useQuery(props), {
        initialProps: { id: 1 },
      });

      await hook.waitForNextUpdate();
      expect(hook.result.current.response).toEqual({ id: 1, name: 'A' });

      hook.rerender({ id: 2 });
      expect(hook.result.current.response).toEqual({ id: 1, name: 'A' });

      await hook.waitForNextUpdate();
      expect(hook.result.current.response).toEqual({ id: 2, name: 'B' });

      hook.rerender({ id: 1 });
      expect(hook.result.current.response).toEqual({ id: 1, name: 'A' });
    });
  });
});