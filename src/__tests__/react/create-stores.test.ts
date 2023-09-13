import { act, renderHook } from '@testing-library/react-hooks';

import { createStores, UseStores } from '../../react/create-stores';

describe('createStores', () => {
  describe('simple counter', () => {
    type Store = { counter: number; increment: () => void };
    type Key = { id?: number };
    let useStores: UseStores<Key, Store>;

    beforeEach(() => {
      useStores = createStores<Key, Store>(({ set }) => ({
        counter: 1,
        increment: () => set((prev) => ({ counter: prev.counter + 1 })),
      }));
    });

    it('should initialize the state with the initial data', () => {
      const { result } = renderHook(() => useStores());

      expect(result.current.counter).toEqual(1);
    });

    it('should subscribe to state changes', () => {
      const hook1a = renderHook(() => useStores());
      const hook1b = renderHook(() => useStores());
      const hook2a = renderHook(() => useStores({ id: 2 }));
      const hook2b = renderHook(() => useStores({ id: 2 }));
      const hook3a = renderHook(() => useStores({ id: 3 }));
      const hook3b = renderHook(() => useStores({ id: 3 }));

      expect(hook1a.result.current.counter).toEqual(1);
      expect(hook1b.result.current.counter).toEqual(1);
      expect(hook2a.result.current.counter).toEqual(1);
      expect(hook2b.result.current.counter).toEqual(1);
      expect(hook3a.result.current.counter).toEqual(1);
      expect(hook3b.result.current.counter).toEqual(1);

      act(() => {
        hook1a.result.current.increment();
      });

      expect(hook1a.result.current.counter).toEqual(2);
      expect(hook1b.result.current.counter).toEqual(2);
      expect(hook2a.result.current.counter).toEqual(1);
      expect(hook2b.result.current.counter).toEqual(1);
      expect(hook3a.result.current.counter).toEqual(1);
      expect(hook3b.result.current.counter).toEqual(1);

      act(() => {
        hook2a.result.current.increment();
      });

      expect(hook1a.result.current.counter).toEqual(2);
      expect(hook1b.result.current.counter).toEqual(2);
      expect(hook2a.result.current.counter).toEqual(2);
      expect(hook2b.result.current.counter).toEqual(2);
      expect(hook3a.result.current.counter).toEqual(1);
      expect(hook3b.result.current.counter).toEqual(1);
    });

    it('should set/get state outside the component', () => {
      const hook1a = renderHook(() => useStores());
      const hook1b = renderHook(() => useStores());
      const hook2a = renderHook(() => useStores({ id: 2 }));
      const hook2b = renderHook(() => useStores({ id: 2 }));
      const hook3a = renderHook(() => useStores({ id: 3 }));
      const hook3b = renderHook(() => useStores({ id: 3 }));

      act(() => {
        useStores.set({}, { counter: 5 });
      });

      expect(useStores.get({}).counter).toEqual(5);
      expect(useStores.get({ id: 2 }).counter).toEqual(1);
      expect(useStores.get({ id: 3 }).counter).toEqual(1);
      expect(hook1a.result.current.counter).toEqual(5);
      expect(hook1b.result.current.counter).toEqual(5);
      expect(hook2a.result.current.counter).toEqual(1);
      expect(hook2b.result.current.counter).toEqual(1);
      expect(hook3a.result.current.counter).toEqual(1);
      expect(hook3b.result.current.counter).toEqual(1);

      act(() => {
        useStores.set({ id: 2 }, { counter: 7 });
      });

      expect(useStores.get({}).counter).toEqual(5);
      expect(useStores.get({ id: 2 }).counter).toEqual(7);
      expect(useStores.get({ id: 3 }).counter).toEqual(1);
      expect(hook1a.result.current.counter).toEqual(5);
      expect(hook1b.result.current.counter).toEqual(5);
      expect(hook2a.result.current.counter).toEqual(7);
      expect(hook2b.result.current.counter).toEqual(7);
      expect(hook3a.result.current.counter).toEqual(1);
      expect(hook3b.result.current.counter).toEqual(1);
    });

    it('should be able to set custom reactivity', () => {
      const useStores2 = createStores(() => ({ a: 1, b: 10 }));

      const hook1 = renderHook(() => useStores2((state) => [state.a]));
      const hook2 = renderHook(() => useStores2((state) => [state.b]));

      expect(hook1.result.current.a).toEqual(1);
      expect(hook2.result.current.b).toEqual(10);

      act(() => {
        useStores2.set(null, { a: 2 });
      });

      expect(hook1.result.current.a).toEqual(2);
      expect(hook2.result.current.a).toEqual(1);

      act(() => {
        useStores2.set(null, { b: 20 });
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
    const onBeforeChangeKeyMock = jest.fn();
    const onStoreInitializedMock = jest.fn();

    const options = {
      onFirstSubscribe: onFirstSubscribeMock,
      onSubscribe: onSubscribeMock,
      onUnsubscribe: onUnsubscribeMock,
      onLastUnsubscribe: onLastUnsubscribeMock,
      onBeforeChangeKey: onBeforeChangeKeyMock,
      onStoreInitialized: onStoreInitializedMock,
    };

    type Store = { counter: number; increment: () => void };
    type Key = { id?: number };
    let useStores: UseStores<Key, Store>;

    beforeEach(() => {
      useStores = createStores<Key, Store>(
        ({ set }) => ({
          counter: 1,
          increment: () => set((prev) => ({ counter: prev.counter + 1 })),
        }),
        options,
      );
    });

    it('should trigger the store event', () => {
      const hook1a = renderHook(() => useStores());
      expect(onFirstSubscribeMock).toHaveBeenCalledTimes(1);
      expect(onSubscribeMock).toHaveBeenCalledTimes(1);
      expect(onStoreInitializedMock).toHaveBeenCalledTimes(1);

      const hook2a = renderHook(() => useStores({ id: 2 }));
      expect(onFirstSubscribeMock).toHaveBeenCalledTimes(2);
      expect(onSubscribeMock).toHaveBeenCalledTimes(2);

      const hook1b = renderHook(() => useStores());
      expect(onSubscribeMock).toHaveBeenCalledTimes(3);

      const hook2b = renderHook((props?: { id: number }) => useStores(props), {
        initialProps: { id: 2 },
      });
      expect(onSubscribeMock).toHaveBeenCalledTimes(4);

      hook1a.unmount();
      expect(onUnsubscribeMock).toHaveBeenCalledTimes(1);

      hook1b.unmount();
      expect(onUnsubscribeMock).toHaveBeenCalledTimes(2);
      expect(onLastUnsubscribeMock).toHaveBeenCalledTimes(1);

      hook2a.unmount();
      expect(onUnsubscribeMock).toHaveBeenCalledTimes(3);

      hook2b.rerender({ id: 3 });
      expect(onBeforeChangeKeyMock).toHaveBeenCalledTimes(1);
      expect(onBeforeChangeKeyMock).toHaveBeenCalledWith({ id: 3 }, { id: 2 });

      expect(onUnsubscribeMock).toHaveBeenCalledTimes(4);
      expect(onLastUnsubscribeMock).toHaveBeenCalledTimes(2);
      expect(onFirstSubscribeMock).toHaveBeenCalledTimes(3);
      expect(onSubscribeMock).toHaveBeenCalledTimes(5);

      hook2b.unmount();
      expect(onUnsubscribeMock).toHaveBeenCalledTimes(5);
      expect(onLastUnsubscribeMock).toHaveBeenCalledTimes(3);
      expect(onStoreInitializedMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('store methods', () => {
    type Store = { counter: number; increment: () => void };
    type Key = { id?: number };
    let useStores: UseStores<Key, Store>;

    beforeEach(() => {
      useStores = createStores<Key, Store>(({ set }) => ({
        counter: 1,
        increment: () => set((prev) => ({ counter: prev.counter + 1 })),
      }));
    });

    it('should handle store methods correctly', async () => {
      expect(useStores.getAll().length).toBe(0);
      expect(useStores.getAllWithSubscriber().length).toBe(0);

      const hook1a = renderHook(() => useStores());
      const hook1b = renderHook(() => useStores());
      const hook2a = renderHook(() => useStores({ id: 2 }));
      const hook2b = renderHook((props?: { id: number }) => useStores(props), {
        initialProps: { id: 2 },
      });
      expect(useStores.getAll().length).toBe(2);
      expect(useStores.getAllWithSubscriber().length).toBe(2);

      hook1a.unmount();
      expect(useStores.getAll().length).toBe(2);
      expect(useStores.getAllWithSubscriber().length).toBe(2);
      hook1b.unmount();
      expect(useStores.getAll().length).toBe(2);
      expect(useStores.getAllWithSubscriber().length).toBe(1);

      hook2a.unmount();
      expect(useStores.getAll().length).toBe(2);
      expect(useStores.getAllWithSubscriber().length).toBe(1);

      hook2b.rerender({ id: 3 });
      expect(useStores.getAll().length).toBe(3);
      expect(useStores.getAllWithSubscriber().length).toBe(1);
      expect(useStores.getSubscribers({ id: 2 }).size).toBe(0);
      expect(useStores.getSubscribers({ id: 3 }).size).toBe(1);

      hook2b.unmount();
      expect(useStores.getAll().length).toBe(3);
      expect(useStores.getAllWithSubscriber().length).toBe(0);
    });
  });
});
