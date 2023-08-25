import { act, renderHook } from '@testing-library/react-hooks';

import { createStore, UseStore } from '../../react/create-store';

describe('createStore', () => {
  describe('simple counter', () => {
    type Store = { counter: number; increment: () => void };
    let useStore: UseStore<Store>;

    beforeEach(() => {
      useStore = createStore<Store>(({ set }) => ({
        counter: 1,
        increment: () => set((prev) => ({ counter: prev.counter + 1 })),
      }));
    });

    it('should initialize the state with the initial data', () => {
      const { result } = renderHook(() => useStore());

      expect(result.current.counter).toEqual(1);
    });

    it('should subscribe to state changes', () => {
      const hook1 = renderHook(() => useStore());
      const hook2 = renderHook(() => useStore());

      expect(hook1.result.current.counter).toEqual(1);
      expect(hook2.result.current.counter).toEqual(1);

      act(() => {
        hook1.result.current.increment();
      });

      expect(hook1.result.current.counter).toEqual(2);
      expect(hook2.result.current.counter).toEqual(2);
    });

    it('should set/get state outside the component', () => {
      const hook1 = renderHook(() => useStore());
      const hook2 = renderHook(() => useStore());

      expect(hook1.result.current.counter).toEqual(1);
      expect(hook2.result.current.counter).toEqual(1);

      act(() => {
        useStore.set({ counter: 5 });
      });

      expect(useStore.get().counter).toEqual(5);
      expect(hook1.result.current.counter).toEqual(5);
      expect(hook2.result.current.counter).toEqual(5);

      act(() => {
        useStore.get().increment();
      });

      expect(useStore.get().counter).toEqual(6);
      expect(hook1.result.current.counter).toEqual(6);
      expect(hook2.result.current.counter).toEqual(6);
    });

    it('should be able to set custom reactivity', () => {
      const useStore2 = createStore(() => ({ a: 1, b: 10 }));

      const hook1 = renderHook(() => useStore2((state) => [state.a]));
      const hook2 = renderHook(() => useStore2((state) => [state.b]));

      expect(hook1.result.current.a).toEqual(1);
      expect(hook2.result.current.b).toEqual(10);

      act(() => {
        useStore2.set({ a: 2 });
      });

      expect(hook1.result.current.a).toEqual(2);
      expect(hook2.result.current.a).toEqual(1);

      act(() => {
        useStore2.set({ b: 20 });
      });

      expect(hook1.result.current.a).toEqual(2);
      expect(hook1.result.current.b).toEqual(10);
      expect(hook2.result.current.a).toEqual(2);
      expect(hook2.result.current.b).toEqual(20);
    });
  });

  describe('store event', () => {
    const onFirstSubscribeMock = jest.fn();
    const onSubscribeMock = jest.fn();
    const onUnsubscribeMock = jest.fn();
    const onLastUnsubscribeMock = jest.fn();

    const options = {
      onFirstSubscribe: onFirstSubscribeMock,
      onSubscribe: onSubscribeMock,
      onUnsubscribe: onUnsubscribeMock,
      onLastUnsubscribe: onLastUnsubscribeMock,
    };

    type Store = { counter: number; increment: () => void };
    let useStore: UseStore<Store>;

    beforeEach(() => {
      useStore = createStore<Store>(
        ({ set }) => ({
          counter: 1,
          increment: () => set((prev) => ({ counter: prev.counter + 1 })),
        }),
        options,
      );
    });

    it('should trigger the store event', () => {
      const hook1 = renderHook(() => useStore());
      expect(onFirstSubscribeMock).toHaveBeenCalledTimes(1);
      expect(onSubscribeMock).toHaveBeenCalledTimes(1);

      const hook2 = renderHook(() => useStore());
      expect(onSubscribeMock).toHaveBeenCalledTimes(2);

      hook1.unmount();
      expect(onUnsubscribeMock).toHaveBeenCalledTimes(1);

      hook2.unmount();
      expect(onUnsubscribeMock).toHaveBeenCalledTimes(2);
      expect(onLastUnsubscribeMock).toHaveBeenCalledTimes(1);
    });
  });
});
