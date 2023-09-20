import { act, renderHook } from '@testing-library/react-hooks';

import { createMutation, UseMutation } from '../../react/create-mutation';

describe('createMutation - without param', () => {
  type Var = undefined;
  type Response = { status: string };
  let useMutation: UseMutation<Var, Response>;

  let mutationFn = jest.fn();

  beforeEach(() => {
    mutationFn = jest.fn().mockImplementation(async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ status: 'success' }), 100);
      });
    });
    useMutation = createMutation<Var, Response>(mutationFn);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useMutation());
    expect(mutationFn).not.toHaveBeenCalled();
    expect(result.current.isWaiting).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.response).toBe(null);
    expect(result.current.responseUpdatedAt).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.errorUpdatedAt).toBe(null);
  });

  it('should update state after successful mutation', async () => {
    const hook1 = renderHook(() => useMutation());
    const hook2 = renderHook(() => useMutation());

    act(() => {
      hook1.result.current.mutate();
      const state = useMutation.get();
      expect(state.isWaiting).toBe(true);
      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(mutationFn).toHaveBeenCalledWith(undefined, state);
    });

    await hook1.waitForNextUpdate();

    const { current } = hook1.result;
    expect(current.isWaiting).toBe(false);
    expect(current.isSuccess).toBe(true);
    expect(current.isError).toBe(false);
    expect(current.response).toEqual({ status: 'success' });
    expect(current.responseUpdatedAt).not.toBe(null);
    expect(current.error).toBe(null);
    expect(current.errorUpdatedAt).toBe(null);

    expect(hook2.result.current).toBe(current);
  });
});

describe('createMutation - with param', () => {
  type Var = { id: string; value: number };
  type Response = { status: string };
  let useMutation: UseMutation<Var, Response>;

  let mutationFn = jest.fn();

  beforeEach(() => {
    mutationFn = jest.fn().mockImplementation(async (param) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ status: 'success', id: param.id }), 100);
      });
    });
    useMutation = createMutation<Var, Response>(mutationFn);
  });

  it('should update state after successful mutation', async () => {
    const hook1 = renderHook(() => useMutation());
    const hook2 = renderHook(() => useMutation());

    act(() => {
      hook1.result.current.mutate({ id: 'a', value: 1 });
      const state = useMutation.get();
      expect(state.isWaiting).toBe(true);
      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(mutationFn).toHaveBeenCalledWith({ id: 'a', value: 1 }, state);
    });

    await hook1.waitForNextUpdate();

    expect(hook1.result.current.isWaiting).toBe(false);
    expect(hook1.result.current.isSuccess).toBe(true);
    expect(hook1.result.current.isError).toBe(false);
    expect(hook1.result.current.response).toEqual({ status: 'success', id: 'a' });
    expect(hook1.result.current.responseUpdatedAt).not.toBe(null);
    expect(hook1.result.current.error).toBe(null);
    expect(hook1.result.current.errorUpdatedAt).toBe(null);

    expect(hook2.result.current).toBe(hook1.result.current);

    act(() => {
      hook1.result.current.mutate({ id: 'b', value: 2 });
      const state = useMutation.get();
      expect(state.isWaiting).toBe(true);
      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(mutationFn).toHaveBeenCalledWith({ id: 'b', value: 2 }, state);
    });

    await hook1.waitForNextUpdate();

    expect(hook1.result.current.isWaiting).toBe(false);
    expect(hook1.result.current.isSuccess).toBe(true);
    expect(hook1.result.current.isError).toBe(false);
    expect(hook1.result.current.response).toEqual({ status: 'success', id: 'b' });
    expect(hook1.result.current.responseUpdatedAt).not.toBe(null);
    expect(hook1.result.current.error).toBe(null);
    expect(hook1.result.current.errorUpdatedAt).toBe(null);

    expect(hook2.result.current).toBe(hook1.result.current);
  });

  it('should handle error correctly', async () => {
    let timesCalled = 0;
    mutationFn = jest.fn().mockImplementation(async (param) => {
      // Success, then error
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          timesCalled++;
          if (timesCalled > 1) {
            reject(new Error('Test error'));
          } else {
            resolve({ status: 'success', id: param.id });
          }
        }, 100);
      });
    });
    useMutation = createMutation<Var, Response>(mutationFn);

    const hook1 = renderHook(() => useMutation());
    const hook2 = renderHook(() => useMutation());

    act(() => {
      hook1.result.current.mutate({ id: 'a', value: 1 });
      const state = useMutation.get();
      expect(state.isWaiting).toBe(true);
      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(mutationFn).toHaveBeenCalledWith({ id: 'a', value: 1 }, state);
    });

    await hook1.waitForNextUpdate();

    expect(hook1.result.current.isWaiting).toBe(false);
    expect(hook1.result.current.isSuccess).toBe(true);
    expect(hook1.result.current.isError).toBe(false);
    expect(hook1.result.current.response).toEqual({ status: 'success', id: 'a' });
    expect(hook1.result.current.responseUpdatedAt).not.toBe(null);
    expect(hook1.result.current.error).toBe(null);
    expect(hook1.result.current.errorUpdatedAt).toBe(null);

    expect(hook2.result.current).toBe(hook1.result.current);

    act(() => {
      hook1.result.current.mutate({ id: 'b', value: 2 });
      const state = useMutation.get();
      expect(state.isWaiting).toBe(true);
      expect(mutationFn).toHaveBeenCalledTimes(2);
      expect(mutationFn).toHaveBeenCalledWith({ id: 'b', value: 2 }, state);
    });

    await hook1.waitForNextUpdate();

    expect(hook1.result.current.isWaiting).toBe(false);
    expect(hook1.result.current.isSuccess).toBe(false);
    expect(hook1.result.current.isError).toBe(true);
    expect(hook1.result.current.response).toEqual({ status: 'success', id: 'a' });
    expect(hook1.result.current.responseUpdatedAt).not.toBe(null);
    expect(hook1.result.current.error).toEqual(new Error('Test error'));
    expect(hook1.result.current.errorUpdatedAt).not.toBe(null);

    expect(hook2.result.current).toBe(hook1.result.current);
  });

  it('should handle mutation event', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const onSettled = jest.fn();

    let timesCalled = 0;
    mutationFn = jest.fn().mockImplementation(async (param) => {
      // Success, then error
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          timesCalled++;
          if (timesCalled > 1) {
            reject(new Error('Test error'));
          } else {
            resolve({ status: 'success', id: param.id });
          }
        }, 100);
      });
    });
    useMutation = createMutation<Var, Response>(mutationFn, {
      onSuccess,
      onError,
      onSettled,
    });

    const hook1 = renderHook(() => useMutation());
    const hook2 = renderHook(() => useMutation());

    let state;

    act(() => {
      hook1.result.current.mutate({ id: 'a', value: 1 });
      state = useMutation.get();
    });

    await hook1.waitForNextUpdate();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(
      { status: 'success', id: 'a' },
      { id: 'a', value: 1 },
      state,
    );
    expect(onError).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith({ id: 'a', value: 1 }, state);

    act(() => {
      hook2.result.current.mutate({ id: 'b', value: 2 });
      state = useMutation.get();
    });

    await hook1.waitForNextUpdate();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(new Error('Test error'), { id: 'b', value: 2 }, state);
  });
});
