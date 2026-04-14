import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createQuery } from "floppy-disk/react";
import * as basic from "../../src/vanilla/basic";

const DEFAULT_STALE_TIME = 2500;
const DEFAULT_RETRY_DELAY = 1500;

describe("createQuery", () => {
  it("fetches data on mount and updates state accordingly", async () => {
    let resolveFn: (value: any) => void;
    const queryFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));

    const query = createQuery(queryFn);

    expect(query().getState()).toMatchObject({
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
    });

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    const stateBeforeQueryFnCalled = { ...result.current, isPending: false };
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledWith({}, stateBeforeQueryFnCalled, "{}");

    expect(result.current).toMatchObject({
      isPending: true,
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
    });

    await act(async () => {
      resolveFn("output");
    });
    expect(result.current).toMatchObject({
      isPending: false,
      isRevalidating: false,
      willRetryAt: undefined,
      isRetrying: false,
      retryCount: 0,
      state: "SUCCESS",
      isSuccess: true,
      isError: false,
      data: "output",
      dataUpdatedAt: expect.any(Number),
      dataStaleAt: result.current.dataUpdatedAt! + DEFAULT_STALE_TIME,
      error: undefined,
      errorUpdatedAt: undefined,
    });
  });

  it("dedupes concurrent executions (same promise)", async () => {
    let resolveFn: (v: any) => void;
    const queryFn = vi.fn(() => new Promise<any>((resolve) => (resolveFn = resolve)));

    const query = createQuery(queryFn);
    const store = query();

    const p1 = store.execute();
    const p2 = store.execute({ overwriteOngoingExecution: false });
    expect(p1).toStrictEqual(p2);
    expect(queryFn).toHaveBeenCalledTimes(1);

    let awaitedP1: any;
    let awaitedP2: any;
    await act(async () => {
      resolveFn("ok");
      awaitedP1 = await p1;
      awaitedP2 = await p2;
    });

    const state = store.getState();
    expect(state.data).toBe("ok");
    expect(awaitedP1).toMatchObject(state);
    expect(awaitedP2).toMatchObject(state);
  });

  it("does not revalidate if data is fresh", async () => {
    const queryFn = vi.fn(async () => "ok");
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

  it("sets state to ERROR when initial fetch fails", async () => {
    let rejectFn: (err: any) => void;
    const queryFn = vi.fn(() => new Promise<string>((_, reject) => (rejectFn = reject)));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const query = createQuery(queryFn, { shouldRetry: () => [false] });

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    expect(result.current).toMatchObject({
      isPending: true,
      willRetryAt: undefined,
      state: "INITIAL",
    });

    const error = new Error("boom");
    await act(async () => {
      rejectFn(error);
    });

    expect(result.current).toMatchObject({
      isPending: false,
      willRetryAt: undefined,
      state: "ERROR",
      isSuccess: false,
      isError: true,
      data: undefined,
      dataUpdatedAt: undefined,
      dataStaleAt: undefined,
      errorUpdatedAt: expect.any(Number),
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error).toHaveProperty("message", "boom");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const loggedState = errorSpy.mock.calls[0][0];
    const { error: _, ...rest } = result.current;
    expect(loggedState).toMatchObject(rest);
    expect(loggedState.error).toBeInstanceOf(Error);
    expect(loggedState.error).toHaveProperty("message", "boom");

    errorSpy.mockRestore();
  });

  it("sets state to SUCCESS_BUT_REVALIDATION_ERROR when revalidation fails", async () => {
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

    expect(result.current.isPending).toBe(true);
    await act(async () => {
      resolveFn("ok");
    });

    const lastDataUpdatedAt = result.current.dataUpdatedAt!;
    expect(result.current).toMatchObject({
      state: "SUCCESS",
      isSuccess: true,
      isError: false,
      data: "ok",
      dataStaleAt: lastDataUpdatedAt + DEFAULT_STALE_TIME,
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);

    const error = new Error("revalidate failed");
    await act(async () => {
      query().invalidate({ overwriteOngoingExecution: true });
    });
    await act(async () => {
      rejectFn(error);
    });

    expect(result.current).toMatchObject({
      state: "SUCCESS_BUT_REVALIDATION_ERROR",
      willRetryAt: undefined,
      isSuccess: true,
      isError: false,
      data: "ok",
      dataUpdatedAt: lastDataUpdatedAt,
      dataStaleAt: lastDataUpdatedAt + DEFAULT_STALE_TIME,
      errorUpdatedAt: expect.any(Number),
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error).toHaveProperty("message", "revalidate failed");

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it("retries on failure based on shouldRetry (when there are subscribers)", async () => {
    vi.useFakeTimers();

    let rejectFn: any;
    let resolveFn: any;
    let promiseSettledAt: number = undefined!;
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
      promiseSettledAt = Date.now();
      rejectFn(new Error("fail"));
    });

    const store = query();
    expect(store.getState()).toMatchObject({
      willRetryAt: promiseSettledAt + 100,
      isRetrying: false,
      retryCount: 0,
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: true,
      retryCount: 1,
    });

    await act(async () => {
      resolveFn("ok");
    });
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: false,
      retryCount: 0,
      state: "SUCCESS",
      isSuccess: true,
      isError: false,
      data: "ok",
      dataUpdatedAt: expect.any(Number),
      error: undefined,
      errorUpdatedAt: undefined,
    });

    vi.useRealTimers();
  });

  it("retries based on default shouldRetry, then stops retrying after limit", async () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let reject1: any;
    let resolve2: any;
    let reject3: any;
    let reject4: any;
    let reject5: any;
    let promiseSettledAt: number = undefined!;

    const queryFn = vi
      .fn()
      // fail → retry → success
      .mockImplementationOnce(() => new Promise((_, reject) => (reject1 = reject)))
      .mockImplementationOnce(() => new Promise((resolve) => (resolve2 = resolve)))
      // next execute: fail → retry → fail again (should stop here)
      .mockImplementationOnce(() => new Promise((_, reject) => (reject3 = reject)))
      .mockImplementationOnce(() => new Promise((_, reject) => (reject4 = reject)))
      // next execute: fail → test unsubscribe → retry cancelled
      .mockImplementationOnce(() => new Promise((_, reject) => (reject5 = reject)));

    const query = createQuery(queryFn);

    const { unmount } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    const store = query();

    await act(async () => {
      promiseSettledAt = Date.now();
      reject1(new Error("fail-1"));
    });
    expect(store.getState()).toMatchObject({
      willRetryAt: promiseSettledAt + DEFAULT_RETRY_DELAY,
      isRetrying: false,
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(queryFn).toHaveBeenCalledTimes(1); // retry not yet triggered
    expect(store.getState()).toMatchObject({
      willRetryAt: promiseSettledAt + DEFAULT_RETRY_DELAY,
      isRetrying: false,
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: true,
      retryCount: 1,
    });

    await act(async () => {
      resolve2("ok");
    });
    expect(store.getState().data).toBe("ok");
    expect(store.getState().error).toBeUndefined();

    await act(async () => {
      store.execute();
    });
    await act(async () => {
      promiseSettledAt = Date.now();
      reject3(new Error("fail-2"));
    });
    expect(store.getState()).toMatchObject({
      willRetryAt: promiseSettledAt + DEFAULT_RETRY_DELAY,
      isRetrying: false,
      retryCount: 0,
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
    expect(queryFn).toHaveBeenCalledTimes(4);
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: true,
      retryCount: 1,
    });

    await act(async () => {
      reject4(new Error("fail-3"));
    });

    const state = store.getState();

    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: false,
      retryCount: 0,
      state: "SUCCESS_BUT_REVALIDATION_ERROR",
      isSuccess: true,
      isError: false,
    });
    expect(state.error).toBeDefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      store.execute();
    });
    await act(async () => {
      promiseSettledAt = Date.now();
      reject5(new Error("fail-4"));
    });
    expect(store.getState()).toMatchObject({
      willRetryAt: promiseSettledAt + DEFAULT_RETRY_DELAY,
      isRetrying: false,
      retryCount: 0,
    });

    unmount();
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: false,
      retryCount: 0,
    });

    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it("cancels retry when a newer execution is triggered", async () => {
    vi.useFakeTimers();

    let reject1: any;
    let resolve2: any;
    const queryFn = vi
      .fn()
      .mockImplementationOnce(() => new Promise((_, reject) => (reject1 = reject)))
      .mockImplementationOnce(() => new Promise((resolve) => (resolve2 = resolve)));

    const query = createQuery(queryFn);

    renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    const store = query();

    // Start req2 while waiting for req1
    await act(async () => {
      store.execute();
    });

    // req1 fails
    await act(async () => {
      reject1(new Error("fail"));
    });
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: false,
      retryCount: 0,
    });

    // Advance time → should NOT retry
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Only 2 calls total (req1 + req2), no retry
    expect(queryFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolve2("ok");
    });
    expect(store.getState()).toMatchObject({
      willRetryAt: undefined,
      isRetrying: false,
      retryCount: 0,
      state: "SUCCESS",
      isSuccess: true,
      isError: false,
      data: "ok",
      dataUpdatedAt: expect.any(Number),
      error: undefined,
      errorUpdatedAt: undefined,
    });

    vi.useRealTimers();
  });

  it("no retry when reset is triggered", async () => {
    vi.useFakeTimers();
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    let rejectFn: any;
    const queryFn = vi.fn(() => new Promise((_, reject) => (rejectFn = reject)));
    const query = createQuery(queryFn);

    renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    const store = query();

    await act(async () => {
      store.reset();
    });

    await act(async () => {
      rejectFn(new Error("fail"));
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(store.getState().data).toBe(undefined);
    expect(store.getState().error).toBe(undefined);
    expect(debugSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    debugSpy.mockRestore();
  });

  it("invalidate does not refetch when no subscribers", () => {
    const queryFn = vi.fn(async () => "ok");
    const query = createQuery(queryFn);
    expect(query().invalidate()).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(0);
  });

  it("supports optimistic update and rollback", async () => {
    const queryFn = vi.fn(async () => "server");
    const query = createQuery(queryFn);
    const store = query();

    await act(async () => {
      await store.execute();
    });
    expect(store.getState().data).toBe("server");

    const { rollback } = store.optimisticUpdate("optimistic");
    expect(store.getState().data).toBe("optimistic");

    rollback();
    expect(store.getState().data).toBe("server");
  });

  it("keeps previous data when query key changes and keepPreviousData is true", async () => {
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

    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolve1("first");
    });
    expect(result.current.data).toBe("first");

    rerender({ id: 2 });
    expect(result.current).toMatchObject({
      isPending: true,
      data: "first",
    });

    await act(async () => {
      resolve2("second");
    });
    expect(result.current.data).toBe("second");
  });

  it("avoids unnecessary re-renders", async () => {
    let resolveFn: any;
    const query = createQuery(() => new Promise<string>((resolve) => (resolveFn = resolve)));

    let fullRender = 0;
    let dataRender = 0;
    let isPendingRender = 0;

    function Full() {
      fullRender++;
      const useQuery = query();
      const state = useQuery();
      return <div>{state.isPending ? "pending" : JSON.stringify(state.data)}</div>;
    }

    function DataOnly() {
      dataRender++;
      const useQuery = query();
      const state = useQuery();
      return <div>{JSON.stringify(state.data)}</div>;
    }

    function IsPendingOnly() {
      isPendingRender++;
      const useQuery = query();
      const { isPending } = useQuery({});
      return <div>{isPending}</div>;
    }

    render(
      <>
        <Full />
        <DataOnly />
        <IsPendingOnly />
      </>,
    );

    expect(fullRender).toBe(1);
    expect(dataRender).toBe(1);
    expect(isPendingRender).toBe(1);

    await act(async () => {
      resolveFn({ value: "ok" });
    });
    expect(fullRender).toBe(2);
    expect(dataRender).toBe(2);
    expect(isPendingRender).toBe(2);

    await act(async () => {
      query().execute();
    });
    await act(async () => {
      resolveFn({ value: "ok" });
    });
    expect(fullRender).toBe(4);
    expect(dataRender).toBe(2);
    expect(isPendingRender).toBe(4);
  });

  it("overwrites ongoing execution when specified (both promises resolve to latest)", async () => {
    let resolve1: any;
    let resolve2: any;
    const queryFn = vi
      .fn()
      .mockImplementationOnce(() => new Promise((res) => (resolve1 = res)))
      .mockImplementationOnce(() => new Promise((res) => (resolve2 = res)));

    const query = createQuery(queryFn);
    const store = query();

    const p1 = store.execute();
    const p2 = store.execute();

    expect(p1).not.toBe(p2);
    expect(queryFn).toHaveBeenCalledTimes(2);

    let r1: any;
    let r2: any;
    await act(async () => {
      resolve1("first-response");
    });
    await act(async () => {
      resolve2("latest-response");
      r1 = await p1;
      r2 = await p2;
    });

    expect(r2.data).toBe("latest-response");
    expect(r1.data).toBe("latest-response");
    expect(store.getState().data).toBe("latest-response");
  });

  it("reset cancels ongoing execution result", async () => {
    let resolveFn: any;
    const query = createQuery(() => new Promise<string>((resolve) => (resolveFn = resolve)));
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const store = query();
    const promise = store.execute();
    store.reset();

    const initialState = {
      isPending: false,
      isRevalidating: false,
      isRetrying: false,
      retryCount: 0,
      state: "INITIAL",
      isSuccess: false,
      isError: false,
      data: undefined,
      dataUpdatedAt: undefined,
      error: undefined,
      errorUpdatedAt: undefined,
    };

    await act(async () => {
      resolveFn("should be ignored");
      const res = await promise;
      expect(res).toMatchObject(initialState);
    });
    expect(store.getState()).toMatchObject(initialState);
    expect(debugSpy).toHaveBeenCalledTimes(1);
    debugSpy.mockRestore();
  });

  it("deletes a store and creates a fresh one on next usage", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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

    let promiseSettledAt = 0;
    expect(result.current.isPending).toBe(true);
    await act(async () => {
      promiseSettledAt = Date.now();
      resolveFn("first");
    });
    expect(result.current).toMatchObject({
      data: "first",
      dataUpdatedAt: promiseSettledAt,
      dataStaleAt: promiseSettledAt + DEFAULT_STALE_TIME,
    });

    rerender({ id: 2 });

    expect(result.current.isPending).toBe(true);
    await act(async () => {
      resolveFn("second");
    });
    expect(result.current.data).toBe("second");

    expect(query({ id: 2 }).delete()).toBe(false);
    expect(query({ id: 1 }).delete()).toBe(true);

    rerender({ id: 1 });
    expect(result.current).toMatchObject({
      data: undefined,
      dataUpdatedAt: undefined,
      dataStaleAt: undefined,
    });
    expect(queryFn).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("executes all stores and respects overwrite flag", async () => {
    const resolveFns: Array<(v: string) => void> = [];
    const queryFn = vi.fn(() => new Promise<string>((resolve) => resolveFns.push(resolve)));

    const query = createQuery<string, { id: number }>(queryFn);

    query({ id: 1 });
    query.executeAll();
    expect(queryFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFns.shift()!("data-1");
    });

    query({ id: 2 });
    query.executeAll();
    expect(queryFn).toHaveBeenCalledTimes(3);

    await act(async () => {
      resolveFns.shift()!("data-2"); // 1 still pending
    });

    query.executeAll({ overwriteOngoingExecution: false });
    expect(queryFn).toHaveBeenCalledTimes(4);

    query.executeAll();
    expect(queryFn).toHaveBeenCalledTimes(6);
  });

  it("revalidates only stale stores", async () => {
    vi.useFakeTimers();

    const resolveFns: Array<(v: string) => void> = [];
    const queryFn = vi.fn(() => new Promise<string>((resolve) => resolveFns.push(resolve)));
    const query = createQuery<string, { id: number }>(queryFn);

    renderHook(() => {
      const a = query({ id: 1 })();
      const b = query({ id: 2 })();
      return { a, b };
    });

    expect(queryFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFns.shift()!("ok1");
      resolveFns.shift()!("ok2");
    });

    // ❌ should NOT revalidate because still fresh
    await act(async () => {
      query.revalidateAll();
    });
    expect(queryFn).toHaveBeenCalledTimes(2);

    // ⏱ make stale
    await act(async () => {
      const defaultStaleTime = 2500;
      vi.advanceTimersByTime(defaultStaleTime);
    });

    // ✅ now revalidate should run
    await act(async () => {
      query.revalidateAll();
    });
    expect(queryFn).toHaveBeenNthCalledWith(
      3,
      { id: 1 },
      expect.objectContaining({ data: "ok1" }),
      '{"id":1}',
    );
    expect(queryFn).toHaveBeenNthCalledWith(
      4,
      { id: 2 },
      expect.objectContaining({ data: "ok2" }),
      '{"id":2}',
    );

    vi.useRealTimers();
  });

  it("invalidates all but only refetches subscribed stores", async () => {
    const isClientSpy = vi.spyOn(basic, "isClient", "get").mockReturnValue(false);

    const queryFn = vi.fn(async ({ id }: { id: number }) => `ok${id}`);
    const query = createQuery<string, { id: number }>(queryFn, { allowSetStateServerSide: true });

    await Promise.all([
      query({ id: 1 }).execute(),
      query({ id: 2 }).execute(),
      query({ id: 3 }).execute(),
    ]);
    expect(queryFn).toHaveBeenCalledTimes(3);
    expect(query({ id: 1 }).getState().data).toBe("ok1");

    const unsub1 = query({ id: 1 }).subscribe(() => {});
    const unsub2 = query({ id: 2 }).subscribe(() => {});

    await act(async () => {
      query.invalidateAll();
    });
    expect(queryFn).toHaveBeenCalledTimes(5);

    await query({ id: 1 }).revalidate(); // still fresh
    expect(queryFn).toHaveBeenCalledTimes(5);

    await query({ id: 3 }).revalidate(); // already invalidated
    expect(queryFn).toHaveBeenCalledTimes(6);

    unsub1();
    unsub2();

    await act(async () => {
      query.invalidateAll();
    });
    expect(queryFn).toHaveBeenCalledTimes(6);

    isClientSpy.mockRestore();
  });

  it("resets all stores to initial state", async () => {
    const queryFn = vi.fn(async ({ id }: { id: number }) => `ok${id}`);
    const query = createQuery<string, { id: number }>(queryFn);

    const s1 = query({ id: 1 });
    const s2 = query({ id: 2 });

    await Promise.all([s1.execute(), s2.execute()]);
    expect(s1.getState().data).toBe("ok1");
    expect(s2.getState().data).toBe("ok2");

    query.resetAll();

    expect(s1.getState()).toMatchObject({
      data: undefined,
      error: undefined,
      isPending: false,
      isSuccess: false,
      isError: false,
      state: "INITIAL",
    });

    expect(s2.getState()).toMatchObject({
      data: undefined,
      error: undefined,
      isPending: false,
      isSuccess: false,
      isError: false,
      state: "INITIAL",
    });
  });

  it("manual setState is overridden by execute", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const queryFn = vi.fn(async () => "server");
    const query = createQuery<string>(queryFn);
    const store = query();

    await store.execute();
    expect(store.getState().data).toBe("server");

    store.setState({ data: "manual" });
    expect(store.getState().data).toBe("manual");

    expect(debugSpy).toHaveBeenCalledTimes(1);
    debugSpy.mockRestore();
  });

  it("revalidates on window focus (only subscribed + stale)", async () => {
    vi.useFakeTimers();

    const resolveFns: Array<(v: string) => void> = [];
    const queryFn = vi.fn(() => new Promise<string>((resolve) => resolveFns.push(resolve)));
    const query = createQuery<string, { id: number }>(queryFn, { staleTime: 1000 });

    renderHook(() => {
      const useQuery = query({ id: 1 });
      return useQuery();
    });

    const { unmount } = renderHook(() => {
      const useQuery = query({ id: 2 });
      return useQuery();
    });

    await act(async () => {
      resolveFns.shift()!("ok1");
      resolveFns.shift()!("ok2");
    });
    expect(queryFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    unmount();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(queryFn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("revalidates on reconnect (only subscribed + stale)", async () => {
    vi.useFakeTimers();

    const resolveFns: Array<(v: string) => void> = [];
    const queryFn = vi.fn(() => new Promise<string>((resolve) => resolveFns.push(resolve)));
    const query = createQuery<string, { id: number }>(queryFn, { staleTime: 1000 });

    renderHook(() => {
      const useQuery = query({ id: 1 });
      return useQuery();
    });

    const { unmount } = renderHook(() => {
      const useQuery = query({ id: 2 });
      return useQuery();
    });

    await act(async () => {
      resolveFns.shift()!("ok1");
      resolveFns.shift()!("ok2");
    });
    expect(queryFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    unmount();

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(queryFn).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it("garbage collects store when no subscribers left", async () => {
    vi.useFakeTimers();

    let resolveFn: (value: string) => void;
    const queryFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));
    const query = createQuery<string>(queryFn, { gcTime: 1000 });

    const { unmount } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    await act(async () => {
      resolveFn("ok");
    });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(query().getState().data).toBe("ok");

    unmount(); // unsubscribe

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(query().getState().data).toBe(undefined);

    vi.useRealTimers();
  });

  it("garbage collects store with ongoing promise", async () => {
    vi.useFakeTimers();

    let resolveFn: (value: string) => void;
    const queryFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));
    const query = createQuery<string>(queryFn, { gcTime: 1000 });

    const { unmount } = renderHook(() => {
      const useQuery = query();
      return useQuery();
    });

    await act(async () => {
      resolveFn("ok");
    });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(query().getState().data).toBe("ok");

    unmount(); // unsubscribe

    query().execute();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(query().getState().data).toBe(undefined);

    await act(async () => {
      resolveFn("ok2");
    });
    expect(query().getState().data).toBe("ok2");

    vi.useRealTimers();
  });

  it("handles enabled option & shallow comparison correctly", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const queryFn = vi.fn(async () => "ok");
    const query = createQuery<string>(queryFn);

    let render = 0;
    const { result } = renderHook(() => {
      render++;
      const useQuery = query();
      return useQuery({ revalidateOnMount: false });
    });

    expect(queryFn).toHaveBeenCalledTimes(0);
    expect(render).toBe(1);
    expect(result.current.data).toBe(undefined);

    await act(async () => {
      query().setState({ data: "manual" });
    });
    expect(render).toBe(2);

    await act(async () => {
      query().setState({ data: "manual" });
    });
    expect(render).toBe(2);

    debugSpy.mockRestore();
  });

  it("sets initial data correctly", async () => {
    const resolveFns: Array<(v: string) => void> = [];
    const queryFn = vi.fn(() => new Promise<string>((resolve) => resolveFns.push(resolve)));
    const query = createQuery<string, { id: number }>(queryFn);

    renderHook(() => {
      const useQuery1 = query({ id: 1 });
      const q1 = useQuery1();

      const useQuery2 = query({ id: 2 });
      useQuery2.setInitialData("initial-2");
      const q2 = useQuery2();

      const useQuery3 = query({ id: 3 });
      useQuery3.setInitialData("initial-3", true);
      const q3 = useQuery3();

      return [q1.data, q2.data, q3.data];
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(query({ id: 1 }).getState().data).toBe(undefined);
    expect(query({ id: 2 }).getState().data).toBe("initial-2");
    expect(query({ id: 3 }).getState().data).toBe("initial-3");

    await act(async () => {
      resolveFns.shift()!("ok-1");
      resolveFns.shift()!("ok-3");
    });

    expect(query({ id: 1 }).getState().data).toBe("ok-1");
    expect(query({ id: 2 }).getState().data).toBe("initial-2");
    expect(query({ id: 3 }).getState().data).toBe("ok-3");
  });

  it("logs error when queryFn returns undefined", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const queryFn = vi.fn(async () => undefined);
    const query = createQuery(queryFn);

    await query().execute();
    expect(spy).toHaveBeenCalledWith(
      "Query function returned undefined. Successful responses must not be undefined.",
    );

    spy.mockRestore();
  });

  it("uses initialData on first render and initializes the query-store", async () => {
    const queryFn = vi.fn(async () => ({ x: 1 }));
    const query = createQuery(queryFn);

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery({
        initialData: { x: 3 },
      });
    });

    expect(result.current).toMatchObject({
      state: "SUCCESS",
      isSuccess: true,
      data: { x: 3 },
      dataUpdatedAt: undefined,
      isError: false,
      error: undefined,
    });
    expect(queryFn).not.toHaveBeenCalled(); // No revalidation triggered

    expect(query().getState()).toMatchObject({
      state: "SUCCESS",
      isSuccess: true,
      data: { x: 3 },
      dataUpdatedAt: undefined,
      isError: false,
      error: undefined,
    });
  });

  it("uses initialData and revalidate", async () => {
    let resolveFn: (value: { x: number }) => void;
    const queryFn = vi.fn(() => new Promise<{ x: number }>((resolve) => (resolveFn = resolve)));
    const query = createQuery(queryFn);

    const { result } = renderHook(() => {
      const useQuery = query();
      return useQuery({
        initialData: { x: 3 },
        initialDataIsStale: true,
      });
    });

    expect(result.current).toMatchObject({
      state: "SUCCESS",
      isSuccess: true,
      data: { x: 3 },
      dataUpdatedAt: undefined,
    });
    expect(queryFn).toHaveBeenCalledTimes(1); // Revalidation triggered

    await act(async () => {
      resolveFn({ x: 33 });
    });
    expect(result.current).toMatchObject({
      isPending: false,
      isRevalidating: false,
      isRetrying: false,
      retryCount: 0,
      state: "SUCCESS",
      isSuccess: true,
      isError: false,
      data: { x: 33 },
      dataUpdatedAt: expect.any(Number),
      error: undefined,
      errorUpdatedAt: undefined,
    });

    expect(query().getState()).toMatchObject({
      isPending: false,
      isRevalidating: false,
      isRetrying: false,
      retryCount: 0,
      state: "SUCCESS",
      isSuccess: true,
      isError: false,
      data: { x: 33 },
      dataUpdatedAt: expect.any(Number),
      error: undefined,
      errorUpdatedAt: undefined,
    });
  });

  it("calls store events correctly", async () => {
    let resolveFn: (v: string) => void;
    const queryFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));

    const onSubscribe = vi.fn();
    const onUnsubscribe = vi.fn();

    const query = createQuery<string, { id: number }>(queryFn, { onSubscribe, onUnsubscribe });

    const { result, rerender, unmount } = renderHook(
      (props: { id: number }) => {
        const useQuery = query(props);
        return useQuery();
      },
      { initialProps: { id: 1 } },
    );

    expect(result.current.isPending).toBe(true);
    await act(async () => {
      resolveFn("first");
    });
    expect(onSubscribe.mock.calls[0][1]).toMatchObject({
      variableHash: '{"id":1}',
      getState: expect.any(Function),
      setState: expect.any(Function),
      setInitialData: expect.any(Function),
      execute: expect.any(Function),
      revalidate: expect.any(Function),
      invalidate: expect.any(Function),
      reset: expect.any(Function),
      delete: expect.any(Function),
      optimisticUpdate: expect.any(Function),
      rollbackOptimisticUpdate: expect.any(Function),
      metadata: expect.any(Object),
    });
    expect(onUnsubscribe).not.toHaveBeenCalled();
    expect(query({ id: 1 }).variableHash).toBe('{"id":1}');

    rerender({ id: 2 });
    expect(onUnsubscribe.mock.calls[0][1]).toMatchObject({
      variableHash: '{"id":1}',
      getState: expect.any(Function),
      setState: expect.any(Function),
      setInitialData: expect.any(Function),
      execute: expect.any(Function),
      revalidate: expect.any(Function),
      invalidate: expect.any(Function),
      reset: expect.any(Function),
      delete: expect.any(Function),
      optimisticUpdate: expect.any(Function),
      rollbackOptimisticUpdate: expect.any(Function),
      metadata: expect.any(Object),
    });
    expect(onSubscribe.mock.calls[1][1]).toMatchObject({
      variableHash: '{"id":2}',
      getState: expect.any(Function),
      setState: expect.any(Function),
      setInitialData: expect.any(Function),
      execute: expect.any(Function),
      revalidate: expect.any(Function),
      invalidate: expect.any(Function),
      reset: expect.any(Function),
      delete: expect.any(Function),
      optimisticUpdate: expect.any(Function),
      rollbackOptimisticUpdate: expect.any(Function),
      metadata: expect.any(Object),
    });
    expect(query({ id: 2 }).variableHash).toBe('{"id":2}');

    expect(result.current.isPending).toBe(true);
    await act(async () => {
      resolveFn("second");
    });

    unmount();
    expect(onUnsubscribe.mock.calls[1][1]).toMatchObject({
      variableHash: '{"id":2}',
      getState: expect.any(Function),
      setState: expect.any(Function),
      setInitialData: expect.any(Function),
      execute: expect.any(Function),
      revalidate: expect.any(Function),
      invalidate: expect.any(Function),
      reset: expect.any(Function),
      delete: expect.any(Function),
      optimisticUpdate: expect.any(Function),
      rollbackOptimisticUpdate: expect.any(Function),
      metadata: expect.any(Object),
    });

    expect(onSubscribe).toHaveBeenCalledTimes(2);
    expect(onUnsubscribe).toHaveBeenCalledTimes(2);
  });
});
