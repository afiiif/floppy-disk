import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createStores } from "floppy-disk/react";

describe("createStores", () => {
  it("returns same underlying store for same key", () => {
    const getStore = createStores({ foo: 0 });
    const storeA = getStore({ id: 1 });
    const storeB = getStore({ id: 1 });

    storeA.setState({ foo: 1 });
    expect(storeB.getState().foo).toBe(1);
    expect(storeA.setState).toBe(storeB.setState);
    expect(storeA.getSubscriberCount).toBe(storeB.getSubscriberCount);

    expect(storeA.key).toBe(storeB.key);
  });

  it("isolates state between stores", () => {
    const getStore = createStores({ foo: 0 });
    const storeA = getStore({ id: 1 });
    const storeB = getStore({ id: 2 });

    act(() => {
      storeA.setState({ foo: 1 });
    });
    expect(storeA.getState().foo).toBe(1);
    expect(storeB.getState().foo).toBe(0);

    expect(storeA.key).toEqual({ id: 1 });
    expect(storeB.key).toEqual({ id: 2 });

    expect(storeA.keyHash).toBe('{"id":1}');
    expect(storeB.keyHash).toBe('{"id":2}');
  });

  it("hook subscribes to correct store based on key", () => {
    const onSubscribe = vi.fn();
    const getStore = createStores<{ count: number }, { id: string }>({ count: 0 }, { onSubscribe });

    let renderA = 0;
    let renderB = 0;

    function CompA() {
      const useStore = getStore({ id: "A" });
      const { count } = useStore();
      renderA++;
      return <div>A: {count}</div>;
    }

    function CompB() {
      const useStore = getStore({ id: "B" });
      const { count } = useStore();
      renderB++;
      return <div>B: {count}</div>;
    }

    render(
      <>
        <CompA />
        <CompB />
      </>,
    );

    act(() => {
      getStore({ id: "A" }).setState({ count: 1 });
    });

    expect(screen.getByText("A: 1")).toBeInTheDocument();
    expect(screen.getByText("B: 0")).toBeInTheDocument();
    expect(renderA).toBe(2);
    expect(renderB).toBe(1);

    expect(onSubscribe.mock.calls[0][1]).toMatchObject({
      key: { id: "A" },
      keyHash: '{"id":"A"}',
      getState: expect.any(Function),
      setState: expect.any(Function),
    });
    expect(onSubscribe.mock.calls[1][1]).toMatchObject({
      key: { id: "B" },
      keyHash: '{"id":"B"}',
      getState: expect.any(Function),
      setState: expect.any(Function),
    });

    expect(getStore({ id: "A" }).keyHash).toBe('{"id":"A"}');
    expect(getStore({ id: "B" }).keyHash).toBe('{"id":"B"}');
  });

  it("does not re-subscribe on re-render with same key", () => {
    const onSubscribe = vi.fn();
    const getStore = createStores({ count: 0 }, { onSubscribe });

    function Comp() {
      const [, forceRender] = useState({});
      const useStore = getStore({ id: 1 });
      useStore();
      return <button onClick={() => forceRender({})}>rerender</button>;
    }

    render(<Comp />);
    expect(onSubscribe).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("rerender"));
    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });

  it("handles delete correctly with active and cleaned subscriptions", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const getStore = createStores({ count: 0 });
    const useStore = getStore({ id: 1 });

    function Comp() {
      useStore();
      return null;
    }

    const { unmount } = render(<Comp />);
    act(() => {
      useStore.setState({ count: 2 });
    });

    const resultWhileMounted = useStore.delete();
    expect(resultWhileMounted).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(useStore.getState()).toEqual({ count: 2 });

    unmount();
    const resultAfterUnmount = useStore.delete();
    expect(resultAfterUnmount).toBe(true);
    expect(useStore.getState()).toEqual({ count: 0 });

    warnSpy.mockRestore();
  });
});
