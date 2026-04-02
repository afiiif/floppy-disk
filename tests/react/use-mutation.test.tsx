import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMutation } from "floppy-disk/react";

describe("useMutation", () => {
  it("returns initial state correctly", () => {
    const { result } = renderHook(() => useMutation(async () => "ok"));

    const [state] = result.current;

    expect(state).toMatchObject({
      state: "INITIAL",
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: undefined,
    });
  });

  it("handles success flow correctly", async () => {
    let resolveFn: (v: string) => void;
    const mutationFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();

    const { result } = renderHook(() => useMutation(mutationFn, { onSuccess, onError, onSettled }));

    let promise: Promise<any>;

    await act(async () => {
      promise = result.current[1].execute("input");
    });
    expect(result.current[0].isPending).toBe(true);

    let res: any;
    await act(async () => {
      resolveFn!("output");
      res = await promise;
    });

    expect(res).toEqual({
      data: "output",
      variable: "input",
    });

    expect(result.current[0]).toMatchObject({
      state: "SUCCESS",
      isPending: false,
      isSuccess: true,
      isError: false,
      data: "output",
      variable: "input",
    });

    expect(onSuccess).toHaveBeenCalledWith("output", "input", expect.any(Object));
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledWith("input", expect.any(Object));
  });

  it("handles error flow correctly", async () => {
    let rejectFn: (err: any) => void;
    const mutationFn = vi.fn(() => new Promise<string>((_, reject) => (rejectFn = reject)));
    const onError = vi.fn();

    const { result } = renderHook(() => useMutation(mutationFn, { onError }));

    let promise: Promise<any>;
    await act(async () => {
      promise = result.current[1].execute("input");
    });

    const error = new Error("boom");
    let res: any;
    await act(async () => {
      rejectFn(error);
      res = await promise;
    });

    expect(res).toEqual({
      error,
      variable: "input",
    });

    expect(result.current[0]).toMatchObject({
      state: "ERROR",
      isError: true,
      variable: "input",
    });

    expect(result.current[0].error).toBeInstanceOf(Error);
    expect(result.current[0].error).toHaveProperty("message", "boom");
    expect(onError).toHaveBeenCalledWith(error, "input", expect.any(Object));
  });

  it("supports promise chaining (latest execution wins)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const settleFns: Array<[(v: number) => void, (err: any) => void]> = [];
    const mutationFn = vi.fn(
      (_v: number) => new Promise<number>((resolve, reject) => settleFns.push([resolve, reject])),
    );

    const { result } = renderHook(() => useMutation(mutationFn));

    let p1: Promise<any>;
    let p2: Promise<any>;
    await act(async () => {
      p1 = result.current[1].execute(1);
      p2 = result.current[1].execute(2);
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFns.shift()![0](111);
      settleFns.shift()![0](222);
    });

    const res1 = await p1!;
    const res2 = await p2!;
    expect(res1).toEqual(res2);
    expect(res1.data).toBe(222);

    await act(async () => {
      p1 = result.current[1].execute(1);
      p2 = result.current[1].execute(2);
    });
    expect(warnSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      settleFns.shift()![1](new Error("333"));
      settleFns.shift()![1](new Error("444"));
    });
    const res3 = await p1!;
    const res4 = await p2!;

    expect(res3).toEqual(res4);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("getLatestState returns fresh state without re-render", async () => {
    const { result } = renderHook(() => useMutation(() => new Promise(() => {})));

    await act(async () => {
      result.current[1].execute();
      expect(result.current[1].getLatestState().isPending).toBe(true);
    });
  });

  it("passes correct stateBeforeExecute", async () => {
    const mutationFn = vi.fn(async (v) => `ok-${v}`);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useMutation(mutationFn, { onSuccess }));

    await act(async () => {
      await result.current[1].execute(1);
    });
    expect(mutationFn).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ state: "INITIAL" }));

    await act(async () => {
      await result.current[1].execute(2);
    });
    expect(mutationFn).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({ state: "SUCCESS" }));
  });

  it("resets state correctly", async () => {
    const { result } = renderHook(() => useMutation(async () => "ok"));

    await act(async () => {
      await result.current[1].execute();
    });
    expect(result.current[0].state).toBe("SUCCESS");

    await act(async () => {
      result.current[1].reset();
    });
    expect(result.current[0]).toMatchObject({
      state: "INITIAL",
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: undefined,
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await act(async () => {
      result.current[1].execute();
      result.current[1].reset();
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
