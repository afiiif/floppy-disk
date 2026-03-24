import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createMutation } from 'floppy-disk/react';

describe('createMutation', () => {
  it('returns initial state correctly', () => {
    const useMutation = createMutation(async () => 'ok');

    const { result } = renderHook(() => useMutation());

    expect(result.current).toMatchObject({
      state: 'INITIAL',
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: undefined,
    });
  });

  it('handles success flow correctly', async () => {
    let resolveFn: (value: string) => void;
    const mutationFn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)));
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();

    const useMutation = createMutation(mutationFn, {
      onSuccess,
      onError,
      onSettled,
    });

    const { result } = renderHook(() => useMutation());
    expect(result.current.state).toBe('INITIAL');
    expect(result.current.isPending).toBe(false);

    let promise: Promise<any>;
    act(() => {
      promise = useMutation.execute('input');
    });
    expect(result.current.isPending).toBe(true);
    expect(result.current.state).toBe('INITIAL');

    let res: any;
    await act(async () => {
      resolveFn('output');
      res = await promise;
    });
    expect(res).toEqual({
      data: 'output',
      variable: 'input',
    });

    expect(result.current).toMatchObject({
      state: 'SUCCESS',
      isPending: false,
      isSuccess: true,
      isError: false,
      data: 'output',
      variable: 'input',
    });
    expect(result.current.dataUpdatedAt).toBeTypeOf('number');

    const state = useMutation.getState();
    expect(state).toMatchObject({
      state: 'SUCCESS',
      isPending: false,
      isSuccess: true,
      isError: false,
      data: 'output',
      variable: 'input',
    });

    expect(onSuccess).toHaveBeenCalledWith('output', 'input', expect.any(Object));
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledWith('input', expect.any(Object));
  });

  it('handles error flow correctly', async () => {
    let rejectFn: (error: any) => void;
    const mutationFn = vi.fn(() => new Promise<string>((_, reject) => (rejectFn = reject)));
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();

    const useMutation = createMutation(mutationFn, {
      onSuccess,
      onError,
      onSettled,
    });

    const { result } = renderHook(() => useMutation());
    expect(result.current.state).toBe('INITIAL');
    expect(result.current.isPending).toBe(false);

    let promise: Promise<any>;
    act(() => {
      promise = useMutation.execute('input');
    });
    expect(result.current.isPending).toBe(true);
    expect(result.current.state).toBe('INITIAL');

    const error = new Error('boom');
    let res: any;
    await act(async () => {
      rejectFn(error);
      res = await promise;
    });
    expect(res).toEqual({
      error,
      variable: 'input',
    });

    expect(result.current).toMatchObject({
      state: 'ERROR',
      isPending: false,
      isSuccess: false,
      isError: true,
      error,
      variable: 'input',
    });
    expect(result.current.errorUpdatedAt).toBeTypeOf('number');

    const state = useMutation.getState();
    expect(state).toMatchObject({
      state: 'ERROR',
      isPending: false,
      isSuccess: false,
      isError: true,
      error,
      variable: 'input',
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error, 'input', expect.any(Object));
    expect(onSettled).toHaveBeenCalledWith('input', expect.any(Object));
  });

  it('warns when executing while pending', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let resolveFn: any;
    const mutationFn = vi.fn(
      (_: number) => new Promise<number>((resolve) => (resolveFn = resolve)),
    );

    const useMutation = createMutation(mutationFn);
    useMutation.execute(1);
    useMutation.execute(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    resolveFn(123);
    warnSpy.mockRestore();
  });

  it('resets state correctly', async () => {
    const mutation = createMutation(async (_: number) => 'ok');

    await act(async () => {
      await mutation.execute(1);
    });
    expect(mutation.getState().state).toBe('SUCCESS');

    mutation.reset();
    const state = mutation.getState();
    expect(state).toMatchObject({
      state: 'INITIAL',
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: undefined,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mutation.execute(2);
    mutation.reset();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('allows manual setState with debug log', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    const mutation = createMutation(async () => 1);

    mutation.setState({ isPending: true });

    expect(mutation.getState().isPending).toBe(true);
    expect(debugSpy).toHaveBeenCalledTimes(1);
    debugSpy.mockRestore();
  });

  it('selector avoids unnecessary re-renders', async () => {
    let resolveFn: (v: number) => void;
    const useMutation = createMutation(
      (_: number) => new Promise<number>((resolve) => (resolveFn = resolve)),
    );

    let renderAllState = 0;
    let renderOnlyData = 0;

    function FullComp() {
      renderAllState++;
      const state = useMutation(); // no selector
      return <div>{state.isPending ? 'pending' : state.data}</div>;
    }

    function SelectorComp() {
      renderOnlyData++;
      const data = useMutation((s) => s.data);
      return <div>data: {data}</div>;
    }

    render(
      <>
        <FullComp />
        <SelectorComp />
      </>,
    );

    expect(renderAllState).toBe(1);
    expect(renderOnlyData).toBe(1);

    let promise: Promise<any>;
    await act(async () => {
      promise = useMutation.execute(1);
    });
    expect(renderAllState).toBe(2);
    expect(renderOnlyData).toBe(1); // no change → no re-render

    await act(async () => {
      resolveFn!(123);
      await promise;
    });
    expect(renderAllState).toBe(3);
    expect(renderOnlyData).toBe(2); // data changed → re-render
  });

  it('passes correct stateBeforeExecute across multiple executions', async () => {
    const mutationFn = vi.fn(async (variable) => `ok-${variable}`);
    const onSuccess = vi.fn();
    const mutation = createMutation(mutationFn, { onSuccess });

    let res1: any;
    await act(async () => {
      res1 = await mutation.execute(111);
    });
    expect(res1).toEqual({ data: 'ok-111', variable: 111 });

    expect(mutationFn).toHaveBeenNthCalledWith(
      1,
      111,
      expect.objectContaining({ state: 'INITIAL' }),
    );
    expect(onSuccess).toHaveBeenCalledWith(
      'ok-111',
      111,
      expect.objectContaining({ state: 'INITIAL' }),
    );

    let res2: any;
    await act(async () => {
      res2 = await mutation.execute(222);
    });
    expect(res2).toEqual({ data: 'ok-222', variable: 222 });

    expect(mutationFn).toHaveBeenNthCalledWith(
      2,
      222,
      expect.objectContaining({ state: 'SUCCESS' }),
    );
    expect(onSuccess).toHaveBeenCalledWith(
      'ok-222',
      222,
      expect.objectContaining({ state: 'SUCCESS' }),
    );
  });

  it('logs error when onError is not provided', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('boom');
    const mutation = createMutation(async () => {
      throw error;
    });

    await act(async () => {
      await mutation.execute();
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);

    const loggedState = errorSpy.mock.calls[0][0];
    expect(loggedState).toMatchObject({
      variable: undefined,
      state: 'ERROR',
      isSuccess: false,
      isError: true,
      error,
    });

    errorSpy.mockRestore();
  });
});
