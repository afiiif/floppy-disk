import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createStore } from "floppy-disk/react";

describe("createStore", () => {
  it("creates a store hook and api object", () => {
    const store = createStore({ count: 0 });
    expect(typeof store).toBe("function");
    expect(typeof store.getState).toBe("function");
    expect(typeof store.setState).toBe("function");
    expect(typeof store.subscribe).toBe("function");
  });

  it("re-renders correctly based on store state usage", () => {
    const useStore = createStore({
      foo: 2,
      bar: 7,
      baz: { a: { b: 99 }, c: 999 },
    });

    let fullRender = 0;
    let fooRender = 0;
    let barRender = 0;
    let bazRender = 0;
    let fooAndBazRender = 0;

    function Full() {
      const state = useStore();
      fullRender++;
      return (
        <div>
          full: {state.foo}-{state.bar}-{state.baz.a.b}
        </div>
      );
    }

    function Foo() {
      const state = useStore();
      fooRender++;
      return <div>foo: {state.foo}</div>;
    }

    function Bar() {
      const { bar } = useStore();
      barRender++;
      return <div>bar: {bar}</div>;
    }

    function Baz() {
      const { baz } = useStore();
      bazRender++;
      return <div>{JSON.stringify(baz)}</div>;
    }

    function FooAndBaz() {
      const { foo, baz } = useStore();
      fooAndBazRender++;
      return (
        <>
          <div>{foo}</div>
          <div>baz.a.b: {baz.a.b}</div>
        </>
      );
    }

    render(
      <>
        <Full />
        <Foo />
        <Bar />
        <Baz />
        <FooAndBaz />
      </>,
    );

    expect(screen.getByText("full: 2-7-99")).toBeInTheDocument();
    expect(screen.getByText("foo: 2")).toBeInTheDocument();
    expect(screen.getByText("bar: 7")).toBeInTheDocument();
    expect(screen.getByText("baz.a.b: 99")).toBeInTheDocument();

    expect(fullRender).toBe(1);
    expect(fooRender).toBe(1);
    expect(barRender).toBe(1);
    expect(bazRender).toBe(1);
    expect(fooAndBazRender).toBe(1);

    act(() => {
      useStore.setState({ foo: 3 });
    });
    expect(screen.getByText("full: 3-7-99")).toBeInTheDocument();
    expect(screen.getByText("foo: 3")).toBeInTheDocument();
    expect(screen.getByText("bar: 7")).toBeInTheDocument();
    expect(screen.getByText("baz.a.b: 99")).toBeInTheDocument();

    expect(fullRender).toBe(2);
    expect(fooRender).toBe(2);
    expect(barRender).toBe(1);
    expect(bazRender).toBe(1);
    expect(fooAndBazRender).toBe(2);

    act(() => {
      useStore.setState({ baz: { a: { b: 99 }, c: 0 } });
    });
    expect(fullRender).toBe(2);
    expect(fooRender).toBe(2);
    expect(barRender).toBe(1);
    expect(bazRender).toBe(2);
    expect(fooAndBazRender).toBe(2);
  });

  it("react optimizes re-renders when setState multiple times", () => {
    const useStore = createStore({ count: 7 });

    let totalRender = 0;
    function MyComponent() {
      const state = useStore();
      totalRender++;
      return <div>count: {state.count}</div>;
    }

    render(<MyComponent />);
    expect(totalRender).toBe(1);

    act(() => {
      useStore.setState({ count: 77 });
      useStore.setState({ count: 777 });
      useStore.setState({ count: 7777 });
    });
    expect(totalRender).toBe(2);
  });

  it("uses initialState on first render and initializes the store", () => {
    const useStore = createStore({ foo: 0, bar: "x" });

    function MyComponent() {
      const state = useStore({ initialState: { foo: 5 } });
      return (
        <div>
          foo: {state.foo}, bar: {state.bar}
        </div>
      );
    }

    render(<MyComponent />);
    expect(screen.getByText("foo: 5, bar: x")).toBeInTheDocument();
    expect(useStore.getState().foo).toBe(5);
    expect(useStore.getState().bar).toBe("x");
  });

  it("uses store state after initialization (not initialState)", () => {
    const useStore = createStore({ count: 0 });

    let renders = 0;
    function Counter() {
      const state = useStore({ initialState: { count: 5 } });
      renders++;
      return <div>count: {state.count}</div>;
    }

    render(<Counter />);
    expect(renders).toBe(1);

    act(() => {
      useStore.setState({ count: 10 });
    });
    expect(screen.getByText("count: 10")).toBeInTheDocument();
    expect(renders).toBe(2);
  });

  it("does not re-apply initialState on re-render", () => {
    const useStore = createStore({ count: 0 });

    function Counter({ value }: { value: number }) {
      const state = useStore({ initialState: { count: value } });
      return <div>count: {state.count}</div>;
    }

    const { rerender } = render(<Counter value={5} />);
    expect(screen.getByText("count: 5")).toBeInTheDocument();

    // Change initialState input
    rerender(<Counter value={999} />);

    // Should NOT override existing store state
    expect(useStore.getState().count).toBe(5);
    expect(screen.getByText("count: 5")).toBeInTheDocument();
  });
});
