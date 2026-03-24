import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createQuery } from 'floppy-disk/react';

describe('createQuery', () => {
  it('fetches data on mount and updates state accordingly', async () => {
    let resolveFn: (value: any) => void;
    const queryFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));

    const query = createQuery(queryFn);

    expect(query().getState()).toMatchObject({
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
    });

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    expect(result.current).toMatchObject({
      isPending: true,
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
    });

    await act(async () => {
      resolveFn('output');
    });
    expect(result.current).toMatchObject({
      isPending: false,
      isRevalidating: false,
      isRetrying: false,
      retryCount: 0,
      state: 'SUCCESS',
      isSuccess: true,
      isError: false,
      data: 'output',
      error: undefined,
      errorUpdatedAt: undefined,
    });
    expect(result.current.dataUpdatedAt).toBeTypeOf('number');
  });

  it('dedupes concurrent executions (same promise)', async () => {
    let resolveFn: (v: any) => void;
    const queryFn = vi.fn(() => new Promise<any>((resolve) => (resolveFn = resolve)));

    const query = createQuery(queryFn);
    const store = query();

    const p1 = store.execute();
    const p2 = store.execute();
    expect(p1).toStrictEqual(p2);
    expect(queryFn).toHaveBeenCalledTimes(1);

    let awaitedP1: any;
    let awaitedP2: any;
    await act(async () => {
      resolveFn('ok');
      awaitedP1 = await p1;
      awaitedP2 = await p2;
    });

    const state = store.getState();
    expect(state.data).toBe('ok');
    expect(awaitedP1).toMatchObject(state);
    expect(awaitedP2).toMatchObject(state);
  });

  it('does not revalidate if data is fresh', async () => {
    const queryFn = vi.fn(async () => 'ok');
    const query = createQuery(queryFn, { staleTime: 1000 });
    const store = query();

    await act(async () => {
      await store.execute();
    });
    expect(queryFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await store.revalidate();
    });
    expect(queryFn).toHaveBeenCalledTimes(1); // no re-fetch
  });

  it('sets state to ERROR when initial fetch fails', async () => {
    let rejectFn: (err: any) => void;
    const queryFn = vi.fn(() => new Promise<string>((_, reject) => (rejectFn = reject)));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const query = createQuery(queryFn, { shouldRetry: () => [false] });

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    expect(result.current).toMatchObject({
      isPending: true,
      state: 'INITIAL',
    });

    const error = new Error('boom');
    await act(async () => {
      rejectFn(error);
    });

    expect(result.current).toMatchObject({
      isPending: false,
      state: 'ERROR',
      isSuccess: false,
      isError: true,
      data: undefined,
      error,
    });
    expect(result.current.errorUpdatedAt).toBeTypeOf('number');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const loggedState = errorSpy.mock.calls[0][0];
    expect(loggedState).toMatchObject(result.current);
    errorSpy.mockRestore();
  });

  it('sets state to SUCCESS_BUT_REVALIDATION_ERROR when revalidation fails', async () => {
    let resolveFn: (v: string) => void;
    let rejectFn: (err: any) => void;
    const queryFn = vi
      .fn()
      // first call → success
      .mockImplementationOnce(() => new Promise<string>((resolve) => (resolveFn = resolve)))
      // second call → error
      .mockImplementationOnce(() => new Promise<string>((_, reject) => (rejectFn = reject)));

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const query = createQuery(queryFn, {
      onSuccess,
      onError,
      onSettled,
      shouldRetry: () => [false],
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    await act(async () => {
      resolveFn('ok');
    });
    expect(result.current).toMatchObject({
      state: 'SUCCESS',
      isSuccess: true,
      isError: false,
      data: 'ok',
    });

    const error = new Error('revalidate failed');
    await act(async () => {
      query().invalidate(true);
    });
    await act(async () => {
      rejectFn(error);
    });

    expect(result.current).toMatchObject({
      state: 'SUCCESS_BUT_REVALIDATION_ERROR',
      isSuccess: true,
      isError: false,
      data: 'ok',
      error,
    });
    expect(result.current.errorUpdatedAt).toBeTypeOf('number');

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('retries on failure based on shouldRetry (when there are subscribers)', async () => {
    vi.useFakeTimers();

    let rejectFn: any;
    let resolveFn: any;
    const queryFn = vi
      .fn()
      .mockImplementationOnce(() => new Promise((_, reject) => (rejectFn = reject)))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFn = resolve)));

    const query = createQuery(queryFn, {
      shouldRetry: () => [true, 100],
    });

    renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    await act(async () => {
      rejectFn(new Error('fail'));
    });

    const store = query();
    expect(store.getState().isRetrying).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(store.getState().isRetrying).toBe(true);

    await act(async () => {
      resolveFn('ok');
    });
    expect(store.getState().data).toBe('ok');

    vi.useRealTimers();
  });

  it('invalidate does not refetch when no subscribers', () => {
    const queryFn = vi.fn(async () => 'ok');
    const query = createQuery(queryFn);
    expect(query().invalidate()).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(0);
  });

  it('supports optimistic update and rollback', async () => {
    const queryFn = vi.fn(async () => 'server');
    const query = createQuery(queryFn);
    const store = query();

    await act(async () => {
      await store.execute();
    });
    expect(store.getState().data).toBe('server');

    const { rollback } = store.optimisticUpdate('optimistic');
    expect(store.getState().data).toBe('optimistic');

    rollback();
    expect(store.getState().data).toBe('server');
  });

  it('keeps previous data when query key changes and keepPreviousData is true', async () => {
    let resolve1: (v: string) => void;
    let resolve2: (v: string) => void;

    const queryFn = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => (resolve1 = resolve)))
      .mockImplementationOnce(() => new Promise<string>((resolve) => (resolve2 = resolve)));

    const query = createQuery<string, { id: number }>(queryFn);

    const { result, rerender } = renderHook(
      (props: { id: number }) => {
        const useQuery = query(props);
        return useQuery({ keepPreviousData: true });
      },
      { initialProps: { id: 1 } },
    );

    await act(async () => {
      resolve1('first');
    });
    expect(result.current.data).toBe('first');

    rerender({ id: 2 });
    expect(result.current).toMatchObject({
      isPending: true,
      data: 'first',
    });

    await act(async () => {
      resolve2('second');
    });
    expect(result.current.data).toBe('second');
  });

  it('selector avoids unnecessary re-renders', async () => {
    let resolveFn: any;
    const query = createQuery(() => new Promise<string>((resolve) => (resolveFn = resolve)));

    let fullRender = 0;
    let dataRender = 0;

    function Full() {
      fullRender++;
      const useQuery = query();
      const state = useQuery();
      return <div>{state.isPending ? 'pending' : state.data}</div>;
    }

    function DataOnly() {
      dataRender++;
      const useQuery = query();
      const data = useQuery({}, (s) => s.data);
      return <div>{data}</div>;
    }

    render(
      <>
        <Full />
        <DataOnly />
      </>,
    );

    expect(fullRender).toBe(2);
    expect(dataRender).toBe(1);

    await act(async () => {
      resolveFn('ok');
    });
    expect(fullRender).toBe(3);
    expect(dataRender).toBe(2);
  });

  it('overwrites ongoing execution when specified (both promises resolve to latest)', async () => {
    let resolve1: any;
    let resolve2: any;
    const queryFn = vi
      .fn()
      .mockImplementationOnce(() => new Promise((res) => (resolve1 = res)))
      .mockImplementationOnce(() => new Promise((res) => (resolve2 = res)));

    const query = createQuery(queryFn);
    const store = query();

    const p1 = store.execute();
    const p2 = store.execute(true);

    expect(p1).not.toBe(p2);
    expect(queryFn).toHaveBeenCalledTimes(2);

    let r1: any;
    let r2: any;
    await act(async () => {
      resolve1('first-response');
    });
    await act(async () => {
      resolve2('latest-response');
      r1 = await p1;
      r2 = await p2;
    });

    expect(r2.data).toBe('latest-response');
    expect(r1.data).toBe('latest-response');
    expect(store.getState().data).toBe('latest-response');
  });

  it('reset cancels ongoing execution result', async () => {
    let resolveFn: any;
    const query = createQuery(() => new Promise<string>((resolve) => (resolveFn = resolve)));
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const store = query();
    const promise = store.execute();
    store.reset();

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
    };

    await act(async () => {
      resolveFn('should be ignored');
      const res = await promise;
      expect(res).toMatchObject(initialState);
    });
    expect(store.getState()).toMatchObject(initialState);
    expect(debugSpy).toHaveBeenCalledTimes(1);
    debugSpy.mockRestore();
  });

  it('deletes a store and creates a fresh one on next usage', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let resolveFn: (v: string) => void;
    const queryFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));
    const query = createQuery<string, { id: number }>(queryFn);

    const { result, rerender } = renderHook(
      (props: { id: number }) => {
        const useQuery = query(props);
        return useQuery();
      },
      { initialProps: { id: 1 } },
    );

    await act(async () => {
      resolveFn('first');
    });
    expect(result.current.data).toBe('first');

    rerender({ id: 2 });
    await act(async () => {
      resolveFn('second');
    });
    expect(result.current.data).toBe('second');

    expect(query({ id: 2 }).delete()).toBe(false);
    expect(query({ id: 1 }).delete()).toBe(true);

    rerender({ id: 1 });
    expect(result.current.data).toBe(undefined);
    expect(queryFn).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
