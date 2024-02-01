import { act, renderHook } from '@testing-library/react-hooks';

import { createQuery, UseQuery } from '../../../src';

describe('createQuery - infinite query', () => {
  type Key = undefined;
  type Response = { status: string; data: string[]; nextPage: number };
  let useQuery: UseQuery<Key, Response, string[]>;

  let queryFn = jest.fn();

  beforeEach(() => {
    let timesCalled = 0;
    queryFn = jest.fn().mockImplementation(async ({ page }) => {
      const responses: Record<number, any> = {
        1: { status: 'success', data: ['A', 'B', 'C'], nextPage: 2 },
        2: { status: 'success', data: ['D', 'E', 'F'], nextPage: 3 },
        3: { status: 'success', data: ['G'], nextPage: null },
      };
      const responses2: Record<number, any> = {
        1: { status: 'success', data: ['B', 'C', 'D'], nextPage: 2 },
        2: { status: 'success', data: ['E', 'F'], nextPage: 3 },
      };
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          timesCalled++;
          if (timesCalled < 7) {
            if (responses[page]) resolve(responses[page]);
            else reject(new Error('Test error'));
          }
          if (responses2[page]) resolve(responses2[page]);
          else reject(new Error('Test error'));
        }, 44);
      });
    });
    useQuery = createQuery((_, { pageParam = 1 }) => queryFn({ page: pageParam }), {
      select: (response, { data }) => [...(data || []), ...response.data],
      getNextPageParam: (response) => response.nextPage,
    });
  });

  it('should handle fetchNextPage correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useQuery());

    expect(result.current.response).toBe(undefined);
    expect(result.current.data).toBe(undefined);
    expect(result.current.pageParam).toBe(undefined);
    expect(result.current.pageParams).toEqual([undefined]);

    await waitForNextUpdate();
    expect(result.current.response).toEqual({
      status: 'success',
      data: ['A', 'B', 'C'],
      nextPage: 2,
    });
    expect(result.current.data).toEqual(['A', 'B', 'C']);
    expect(result.current.pageParam).toBe(2);
    expect(result.current.pageParams).toEqual([undefined, 2]);

    act(() => {
      // Test dedupe fetchNextPage
      result.current.fetchNextPage();
      result.current.fetchNextPage();
      result.current.fetchNextPage();
    });

    await waitForNextUpdate();
    expect(queryFn).toBeCalledTimes(2);
    expect(result.current.response).toEqual({
      status: 'success',
      data: ['D', 'E', 'F'],
      nextPage: 3,
    });
    expect(result.current.data).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(result.current.pageParam).toBe(3);
    expect(result.current.pageParams).toEqual([undefined, 2, 3]);

    act(() => {
      // Test dedupe fetchNextPage
      result.current.fetchNextPage();
      result.current.fetchNextPage();
      result.current.fetchNextPage();
    });

    await waitForNextUpdate();
    expect(queryFn).toBeCalledTimes(3);
    expect(result.current.response).toEqual({
      status: 'success',
      data: ['G'],
      nextPage: null,
    });
    expect(result.current.data).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(result.current.pageParam).toBe(null);
    expect(result.current.pageParams).toEqual([undefined, 2, 3, null]);

    result.current.fetchNextPage();
    expect(queryFn).toBeCalledTimes(3);

    act(() => {
      result.current.forceFetch();
    });
    await waitForNextUpdate();
    expect(queryFn).toBeCalledTimes(6);

    act(() => {
      result.current.forceFetch();
    });

    const fetchingAndRetryDelay = 100 + 1000;
    await waitForNextUpdate({ timeout: 2 * fetchingAndRetryDelay + 300 });

    expect(queryFn).toBeCalledTimes(10);
    expect(result.current.isRefetchError).toBe(true);
    expect(result.current.data).toEqual(['B', 'C', 'D', 'E', 'F']);
    expect(result.current.pageParam).toBe(3);
    expect(result.current.pageParams).toEqual([undefined, 2, 3, null]);
  });
});
