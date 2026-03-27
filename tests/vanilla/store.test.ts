import { describe, expect, it, vi } from 'vitest';
import { initStore } from 'floppy-disk';
import * as basic from '../../src/vanilla/basic';

describe('initStore', () => {
  it('sets and gets state', () => {
    const store = initStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1 });
  });

  it('merges state (shallow)', () => {
    const store = initStore({ a: 1, b: 2 });
    store.setState({ a: 10 });
    expect(store.getState()).toEqual({ a: 10, b: 2 });
  });

  it('setState function receives latest state and merges correctly', () => {
    const store = initStore({ a: 1, b: 2 });
    store.setState((prev) => {
      expect(prev).toEqual({ a: 1, b: 2 });
      return { a: prev.a + 3 };
    });
    expect(store.getState()).toEqual({ a: 4, b: 2 });
    store.setState((prev) => ({ a: prev.a + 1 }));
    expect(store.getState()).toEqual({ a: 5, b: 2 });
  });

  it('does not notify subscribers if state is same', () => {
    const store = initStore({ count: 0 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ count: 0 });
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it('subscribes and unsubscribes correctly', () => {
    const store = initStore({ count: 0 });
    const fn = vi.fn();

    const unsub = store.subscribe(fn);
    store.setState({ count: 1 });
    expect(fn).toHaveBeenCalledTimes(1);

    unsub();
    store.setState({ count: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns subscribers set', () => {
    const store = initStore({ count: 0 });
    const fn = () => {};
    store.subscribe(fn);
    expect(store.getSubscribers().size).toBe(1);
    expect(store.getSubscribers().has(fn)).toBe(true);
  });

  it('calls onSubscribe & onFirstSubscribe correctly', () => {
    const onFirstSubscribe = vi.fn();
    const onSubscribe = vi.fn();
    const store = initStore({ count: 0 }, { onFirstSubscribe, onSubscribe });

    store.subscribe(() => {});
    store.subscribe(() => {});
    expect(onFirstSubscribe).toHaveBeenCalledTimes(1);
    expect(onSubscribe).toHaveBeenCalledTimes(2);
  });

  it('calls onUnsubscribe & onLastUnsubscribe correctly', () => {
    const onLastUnsubscribe = vi.fn();
    const onUnsubscribe = vi.fn();
    const store = initStore({ count: 0 }, { onUnsubscribe, onLastUnsubscribe });

    const unsub1 = store.subscribe(() => {});
    const unsub2 = store.subscribe(() => {});

    unsub1();
    expect(onLastUnsubscribe).not.toHaveBeenCalled();

    unsub2();
    expect(onLastUnsubscribe).toHaveBeenCalledTimes(1);
    expect(onUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('does not allow setState on server by default', () => {
    const isClientSpy = vi.spyOn(basic, 'isClient', 'get').mockReturnValue(false);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = initStore({ count: 0 });

    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 0 });
    expect(consoleErrorSpy).toHaveBeenCalled();

    isClientSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
