import { act, renderHook } from '@testing-library/react-hooks';

import { createQuery, UseQuery } from '../../react/create-query';

describe('createQuery', () => {
  describe('single query', () => {
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
      expect(current.isLoading).toBe(true);
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

      await hook1.waitForNextUpdate({ timeout: 3500 });
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

      await hook1.waitForNextUpdate();

      expect(hook1.result.current.isError).toBe(true);

      // Retrying

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(2);

      expect(hook1.result.current.isError).toBe(true);

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(3);

      expect(hook1.result.current.isError).toBe(true);

      await hook1.waitForNextUpdate();
      expect(queryFn).toHaveBeenCalledTimes(4);

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
  });
});
