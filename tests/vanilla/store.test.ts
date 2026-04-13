import { describe, expect, it, vi } from "vitest";
import { initStore } from "floppy-disk";
import * as basic from "../../src/vanilla/basic";

describe("initStore", () => {
  it("sets and gets state", () => {
    const store = initStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1 });
  });

  it("merges state (shallow)", () => {
    const store = initStore({ a: 1, b: 2 });
    store.setState({ a: 10 });
    expect(store.getState()).toEqual({ a: 10, b: 2 });
  });

  it("setState function receives latest state and merges correctly", () => {
    const store = initStore({ a: 1, b: 2 });
    store.setState((prev) => {
      expect(prev).toEqual({ a: 1, b: 2 });
      return { a: prev.a + 3 };
    });
    expect(store.getState()).toEqual({ a: 4, b: 2 });
    store.setState((prev) => ({ a: prev.a + 1 }));
    expect(store.getState()).toEqual({ a: 5, b: 2 });
  });

  it("does not notify subscribers if state is same", () => {
    const store = initStore({ count: 0 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.setState({ count: 0 });
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it("subscribes and unsubscribes correctly", () => {
    const store = initStore({ foo: 0, bar: 123 });
    const fn = vi.fn();

    const unsub = store.subscribe(fn);
    store.setState({ foo: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][2]).toEqual(["foo"]);

    unsub();
    store.setState({ foo: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns correct subscriber count", () => {
    const store = initStore({ count: 0 });

    store.subscribe(() => {});
    expect(store.getSubscriberCount()).toBe(1);

    const unsub = store.subscribe(() => {});
    expect(store.getSubscriberCount()).toBe(2);

    unsub();
    expect(store.getSubscriberCount()).toBe(1);

    const fn = () => {};
    store.subscribe(fn);
    expect(store.getSubscriberCount()).toBe(2);
    store.subscribe(fn);
    expect(store.getSubscriberCount()).toBe(2);
  });

  it("calls onSubscribe & onFirstSubscribe correctly", () => {
    const onFirstSubscribe = vi.fn();
    const onSubscribe = vi.fn();
    const store = initStore({ count: 0 }, { onFirstSubscribe, onSubscribe });

    store.subscribe(() => {});
    store.subscribe(() => {});
    expect(onFirstSubscribe).toHaveBeenCalledTimes(1);
    expect(onSubscribe).toHaveBeenCalledTimes(2);
  });

  it("calls onUnsubscribe & onLastUnsubscribe correctly", () => {
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

  it("does not allow setState on server by default", () => {
    const isClientSpy = vi.spyOn(basic, "isClient", "get").mockReturnValue(false);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const store = initStore({ count: 0 });

    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 0 });
    expect(consoleErrorSpy).toHaveBeenCalled();

    isClientSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("calls onStateChange when state changes", () => {
    const spy = vi.fn();
    const store = initStore({ count: 0, value: 42 }, { onStateChange: spy });

    store.setState({ count: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual({ count: 1, value: 42 }); // state
    expect(spy.mock.calls[0][1]).toEqual({ count: 0, value: 42 }); // prevState
    expect(spy.mock.calls[0][2]).toEqual(["count"]); // changedKeys

    store.setState((prev) => ({ value: prev.value + 1 }));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0]).toEqual({ count: 1, value: 43 });
    expect(spy.mock.calls[1][2]).toEqual(["value"]);
  });

  it("does not call onStateChange if state is same", () => {
    const spy = vi.fn();
    const store = initStore({ a: 1 }, { onStateChange: spy });

    store.setState({ a: 1 });
    expect(spy).not.toHaveBeenCalled();
  });

  it("onStateChange does not count as subscriber", () => {
    const spy = vi.fn();
    const store = initStore({ count: 0 }, { onStateChange: spy });
    const subscriber = vi.fn();

    store.subscribe(subscriber);
    store.setState({ count: 1 });

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(store.getSubscriberCount()).toBe(1); // still only the real subscriber
  });

  it("handles multiple state changes correctly", () => {
    const spy = vi.fn();
    const store = initStore({ a: 0, b: 0 }, { onStateChange: spy });

    store.setState({ a: 1, b: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][2]).toEqual(["a", "b"]);

    store.setState({ a: 1, b: 2 }); // no change
    expect(spy).toHaveBeenCalledTimes(1); // still 1 call
  });

  it("does not include inherited keys from prototype chain in changedKeys", () => {
    const store = initStore({ count: 0 });
    const spy = vi.fn();

    store.subscribe(spy);

    // 🚨 simulate prototype pollution
    (Object.prototype as any).polluted = "yes";

    store.setState({ count: 1 });

    expect(spy).toHaveBeenCalledTimes(1);
    const changedKeys = spy.mock.calls[0][2];

    expect(changedKeys).toEqual(["count"]);
    expect(changedKeys).not.toContain("polluted");

    delete (Object.prototype as any).polluted;
  });

  it("ignores __proto__ key from payload", () => {
    const store = initStore({ name: "initial" });
    const spy = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    store.subscribe(spy);

    const payload = JSON.parse(`
      {
        "__proto__": { "polluted": true },
        "name": "updated"
      }
    `);

    store.setState(payload);

    expect(spy).toHaveBeenCalledTimes(1);
    const changedKeys = spy.mock.calls[0][2];

    expect(changedKeys).toEqual(["name"]);
    expect(changedKeys).not.toContain("__proto__");

    expect(consoleWarnSpy).toHaveBeenCalledExactlyOnceWith(
      'Ignored unsafe key "__proto__" in setState(). This key is reserved and may indicate a prototype pollution attempt or malformed payload.',
    );
    consoleWarnSpy.mockRestore();
  });

  it("ignores dangerous keys like constructor and prototype", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const store = initStore({ value: 1 });
    const spy = vi.fn();

    store.subscribe(spy);

    store.setState({
      value: 2,
      constructor: "bad",
      prototype: "bad",
    } as any);

    expect(spy).toHaveBeenCalledTimes(1);
    const changedKeys = spy.mock.calls[0][2];

    expect(changedKeys).toEqual(["value"]);
    expect(changedKeys).not.toContain("constructor");
    expect(changedKeys).not.toContain("prototype");

    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    consoleWarnSpy.mockRestore();
  });

  it("does not trigger update if only dangerous keys are provided", () => {
    const spy = vi.fn();
    const store = initStore({ a: 1 }, { onStateChange: spy });

    store.setState({
      __proto__: { hacked: true },
    } as any);

    expect(spy).not.toHaveBeenCalled();
  });
});
