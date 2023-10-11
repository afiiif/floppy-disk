import { fireEvent } from '@testing-library/react';
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
      expect(result.current.data).toBe(undefined);
      expect(result.current.response).toBe(undefined);
      expect(result.current.responseUpdatedAt).toBe(undefined);
      expect(result.current.error).toBe(undefined);
      expect(result.current.errorUpdatedAt).toBe(undefined);
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
      expect(current.responseUpdatedAt).not.toBe(undefined);
      expect(typeof current.responseUpdatedAt).toBe('number');
      expect(current.error).toBe(undefined);
      expect(current.errorUpdatedAt).toBe(undefined);

      expect(hook2.result.current).toBe(current);
    });

    it('should update state after failed fetch, and should retry after failed fetch', async () => {
      queryFn = jest.fn().mockImplementation(async () => {
        // Always error
        return new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('Test error')), 100);
        });
      });
      useQuery = createQuery<Key, Response>(queryFn);

      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      const fetchingAndRetryDelay = 100 + 1000;
      await hook1.waitForNextUpdate({ timeout: 2 * fetchingAndRetryDelay + 300 });

      const { current } = hook1.result;
      expect(current.status).toBe('error');
      expect(current.isLoading).toBe(false);
      expect(current.isSuccess).toBe(false);
      expect(current.isError).toBe(true);
      expect(current.data).toBe(undefined);
      expect(current.response).toBe(undefined);
      expect(current.responseUpdatedAt).toBe(undefined);
      expect(current.error).toEqual(new Error('Test error'));
      expect(current.errorUpdatedAt).not.toBe(undefined);
      expect(typeof current.errorUpdatedAt).toBe('number');

      expect(hook2.result.current).toBe(current);

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

      expect(hook1.result.current.status).toBe('success');
      expect(hook1.result.current.isLoading).toBe(false);
      expect(hook1.result.current.isSuccess).toBe(true);
      expect(hook1.result.current.isError).toBe(false);
      expect(hook1.result.current.data).toEqual({ id: 1, name: 'test' });
      expect(hook1.result.current.response).toEqual({ id: 1, name: 'test' });
      expect(hook1.result.current.responseUpdatedAt).not.toBe(undefined);
      expect(typeof hook1.result.current.responseUpdatedAt).toBe('number');
      expect(hook1.result.current.error).toBe(undefined);
      expect(hook1.result.current.errorUpdatedAt).toBe(undefined);

      expect(hook2.result.current).toBe(hook1.result.current);

      expect(queryFn).toHaveBeenCalledTimes(4);
    });

    it('should handle refetch error correctly', async () => {
      let timesCalled = 0;
      queryFn = jest.fn().mockImplementation(async () => {
        // Success 1x, then error
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

      const { current } = hook1.result;

      expect(hook1.result.current.status).toBe('success');
      expect(current.isLoading).toBe(false);
      expect(current.isSuccess).toBe(true);
      expect(current.isError).toBe(false);
      expect(current.isRefetchError).toBe(true);
      expect(current.data).toEqual({ id: 1, name: 'test' });
      expect(current.response).toEqual({ id: 1, name: 'test' });
      expect(current.responseUpdatedAt).not.toBe(undefined);
      expect(typeof current.responseUpdatedAt).toBe('number');
      expect(current.error).toEqual(new Error('Test error'));
      expect(current.errorUpdatedAt).not.toBe(undefined);
      expect(typeof current.errorUpdatedAt).toBe('number');

      expect(hook2.result.current).toBe(current);

      expect(queryFn).toHaveBeenCalledTimes(3);
    });

    it('should handle useQuery events correctly', async () => {
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
        retryDelay: 100,
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
      expect(onError).toHaveBeenCalledWith(new Error('Test error'), { ...state, retryCount: 1 });

      expect(queryFn).toBeCalledTimes(3);
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

    it('should handle useQuery methods correctly', async () => {
      const hook1 = renderHook(() => useQuery());
      const hook2 = renderHook(() => useQuery());

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(1);
      const responseUpdatedAt1 = hook1.result.current.responseUpdatedAt;
      expect(responseUpdatedAt1).not.toBe(undefined);

      act(() => {
        useQuery.invalidate();
      });
      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(2);
      const responseUpdatedAt2 = hook1.result.current.responseUpdatedAt;
      expect(responseUpdatedAt2).toBeGreaterThan(responseUpdatedAt1!);
      expect(responseUpdatedAt2).toBe(hook2.result.current.responseUpdatedAt);

      act(() => {
        hook2.result.current.reset();
      });
      expect(hook1.result.current.data).toBe(undefined);
      expect(hook2.result.current.responseUpdatedAt).toBe(undefined);

      act(() => {
        hook1.result.current.fetch();
      });
      await hook2.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(3);

      hook1.unmount();
      hook2.unmount();
      useQuery.invalidate();
      expect(queryFn).toHaveBeenCalledTimes(3);

      expect(useQuery.get().isSuccess).toEqual(true);
      renderHook(() => {
        useQuery.setInitialResponse({
          response: { id: 3, name: 'test-initial-response' },
        });
      });
      expect(useQuery.get().data).toEqual({ id: 1, name: 'test' });

      useQuery.reset();
      expect(useQuery.get().isSuccess).toEqual(false);
      renderHook(() => {
        useQuery.setInitialResponse({
          response: { id: 3, name: 'test-initial-response-again' },
        });
      });
      expect(useQuery.get().data).toEqual({ id: 3, name: 'test-initial-response-again' });
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
      expect(result.current.response).toBe(undefined);
      expect(result.current.responseUpdatedAt).toBe(undefined);
      expect(result.current.error).toBe(undefined);
      expect(result.current.errorUpdatedAt).toBe(undefined);
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
      expect(hook1.result.current.responseUpdatedAt).not.toBe(undefined);
      expect(typeof hook1.result.current.responseUpdatedAt).toBe('number');
      expect(hook1.result.current.error).toBe(undefined);
      expect(hook1.result.current.errorUpdatedAt).toBe(undefined);

      expect(hook2.result.current).toBe(hook1.result.current);

      hook2.rerender({ id: 2 });
      expect(hook2.result.current.isLoading).toBe(true);
      expect(hook2.result.current.isSuccess).toBe(false);
      expect(hook2.result.current.isError).toBe(false);
      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(queryFn).toHaveBeenCalledWith({ id: 2 }, useQuery.get({ id: 2 }));

      await hook2.waitForNextUpdate();

      expect(queryFn).toHaveBeenCalledTimes(3);
      expect(hook2.result.current.isLoading).toBe(false);
      expect(hook2.result.current.isSuccess).toBe(true);
      expect(hook2.result.current.isError).toBe(false);
      expect(hook2.result.current.data).toBe('B');
      expect(hook2.result.current.response).toEqual({ id: 2, name: 'B' });
      expect(hook2.result.current.responseUpdatedAt).not.toBe(undefined);
      expect(typeof hook2.result.current.responseUpdatedAt).toBe('number');
      expect(hook2.result.current.error).toBe(undefined);
      expect(hook2.result.current.errorUpdatedAt).toBe(undefined);
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

    it('should handle window focus & online event correctly', async () => {
      useQuery = createQuery<Key, Response, string>(queryFn, { staleTime: 0 });

      const queryFn2 = jest.fn().mockImplementation(async ({ id }) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ id, name: 'test' }), 100);
        });
      });

      const useQuery2 = createQuery<Key, Response, string>(queryFn2, {
        fetchOnWindowFocus: 'always',
        fetchOnReconnect: 'always',
      });

      const hook1 = renderHook((props: { id: number }) => useQuery(props), {
        initialProps: { id: 1 },
      });
      const hook2 = renderHook((props: { id: number }) => useQuery2(props), {
        initialProps: { id: 11 },
      });

      await hook1.waitForNextUpdate();

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(queryFn2).toHaveBeenCalledTimes(1);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
        fireEvent(window, new Event('focus'));
      });
      await hook2.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(queryFn2).toHaveBeenCalledTimes(2);

      hook2.unmount();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
        fireEvent(window, new Event('focus'));
      });
      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(3);
      expect(queryFn2).toHaveBeenCalledTimes(2);

      hook1.rerender({ id: 2 });
      const hook3 = renderHook(() => useQuery2());
      await hook3.waitForNextUpdate();

      act(() => {
        fireEvent(window, new Event('online'));
      });
      await hook3.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(5);
      expect(queryFn2).toHaveBeenCalledTimes(4);
    });
  });
});
