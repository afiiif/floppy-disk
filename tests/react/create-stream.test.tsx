import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { experimental_createStream } from "floppy-disk/react";

describe("createStream", () => {
  it("connects on mount and updates connection state", async () => {
    let emitRef: any;
    const connect = vi.fn((_, emit) => {
      emitRef = emit;
      return {};
    });

    const stream = experimental_createStream(connect, () => {});

    const { result } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    // Initial render
    expect(result.current.connectionState).toBe("INITIAL");

    // Wait for effect → CONNECTING
    await act(async () => {
      await Promise.resolve(); // flush microtask (queueMicrotask)
    });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(result.current.connectionState).toBe("CONNECTING");

    // Simulate connected
    await act(async () => {
      emitRef.connected();
    });
    expect(result.current.connectionState).toBe("CONNECTED");
  });

  it("receives data updates via emit.data reducer", async () => {
    let emitRef: any;

    const stream = experimental_createStream(
      (_, emit) => {
        emitRef = emit;
        return {};
      },
      () => {},
    );

    const { result } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    expect(result.current).toMatchObject({
      connectionState: "INITIAL",
      connectingAt: undefined,
      connectedAt: undefined,
      disconnectedAt: undefined,
      state: "INITIAL",
      isSuccess: false,
      isError: false,
      data: undefined,
      dataUpdatedAt: undefined,
      error: undefined,
      errorUpdatedAt: undefined,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe("CONNECTING");

    await act(async () => {
      emitRef.data((prev: number | undefined) => (prev ?? 0) + 1);
    });
    expect(result.current).toMatchObject({
      connectionState: "CONNECTED",
      state: "SUCCESS",
      isSuccess: true,
      data: 1,
      dataUpdatedAt: expect.any(Number),
    });

    await act(async () => {
      emitRef.data((prev: number) => prev + 2);
    });
    expect(result.current.data).toBe(3);
  });

  it("handles error before any data", async () => {
    let emitRef: any;

    const stream = experimental_createStream(
      (_, emit) => {
        emitRef = emit;
        return {};
      },
      () => {},
    );

    const { result } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({
      state: "INITIAL",
      isSuccess: false,
      isError: false,
    });

    await act(async () => {
      emitRef.error(new Error("fail"));
    });
    expect(result.current).toMatchObject({
      state: "ERROR",
      isSuccess: false,
      isError: true,
      errorUpdatedAt: expect.any(Number),
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error).toHaveProperty("message", "fail");
  });

  it("transitions to SUCCESS_BUT_THEN_ERROR", async () => {
    let emitRef: any;

    const stream = experimental_createStream(
      (_, emit) => {
        emitRef = emit;
        return {};
      },
      () => {},
    );

    const { result } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toMatchObject({
      state: "INITIAL",
      isSuccess: false,
      isError: false,
    });

    await act(async () => {
      emitRef.data(() => "ok");
    });
    expect(result.current).toMatchObject({
      connectionState: "CONNECTED",
      state: "SUCCESS",
      isSuccess: true,
      data: "ok",
      dataUpdatedAt: expect.any(Number),
      isError: false,
      error: undefined,
      errorUpdatedAt: undefined,
    });

    await act(async () => {
      emitRef.error(new Error("fail"));
    });
    expect(result.current).toMatchObject({
      connectionState: "CONNECTED",
      state: "SUCCESS_BUT_THEN_ERROR",
      isSuccess: true,
      data: "ok",
      isError: true,
      errorUpdatedAt: expect.any(Number),
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error).toHaveProperty("message", "fail");
  });

  it("disconnects after unmount with delay", async () => {
    vi.useFakeTimers();

    const disconnect = vi.fn();

    const stream = experimental_createStream(() => ({}), disconnect, {
      connection: {
        disconnectOn: () => 100,
      },
    });

    const { result, unmount } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    expect(result.current.connectionState).toBe("INITIAL");

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe("CONNECTING");

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(disconnect).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("cancels scheduled disconnect when resubscribed", async () => {
    vi.useFakeTimers();

    const disconnect = vi.fn();

    const stream = experimental_createStream(() => ({}), disconnect, {
      connection: {
        disconnectOn: () => 100,
      },
    });

    const { result, unmount } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    expect(result.current.connectionState).toBe("INITIAL");

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe("CONNECTING");

    unmount();

    // Re-subscribe before timeout
    renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(disconnect).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("manual reconnect replaces connection", async () => {
    let emitRef: any;
    const disconnect = vi.fn();

    const stream = experimental_createStream((_, emit) => {
      emitRef = emit;
      return {};
    }, disconnect);

    const { result } = renderHook(() => {
      const useStream = stream();
      return useStream();
    });

    expect(result.current.connectionState).toBe("INITIAL");

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.connectionState).toBe("CONNECTING");

    await act(async () => {
      emitRef.connected();
    });
    expect(result.current.connectionState).toBe("CONNECTED");

    await act(async () => {
      stream().connection.reconnect();
    });

    expect(disconnect).toHaveBeenCalled();
  });
});
