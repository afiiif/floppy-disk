import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createStore } from 'floppy-disk/react';

describe('createStore', () => {
  it('creates a store hook and api object', () => {
    const store = createStore({ count: 0 });
    expect(typeof store).toBe('function');
    expect(typeof store.getState).toBe('function');
    expect(typeof store.setState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('re-renders correctly for selector and non-selector usage (foo/bar)', () => {
    const useStore = createStore({ foo: 2, bar: 7 });

    let fullRender = 0;
    let fooRender = 0;
    let barRender = 0;

    function Full() {
      const state = useStore(); // no selector
      fullRender++;
      return (
        <div>
          full: {state.foo}-{state.bar}
        </div>
      );
    }

    function Foo() {
      const foo = useStore((s) => s.foo);
      fooRender++;
      return <div>foo: {foo}</div>;
    }

    function Bar() {
      const bar = useStore((s) => s.bar);
      barRender++;
      return <div>bar: {bar}</div>;
    }

    render(
      <>
        <Full />
        <Foo />
        <Bar />
      </>,
    );

    expect(screen.getByText('full: 2-7')).toBeInTheDocument();
    expect(screen.getByText('foo: 2')).toBeInTheDocument();
    expect(screen.getByText('bar: 7')).toBeInTheDocument();

    expect(fullRender).toBe(1);
    expect(fooRender).toBe(1);
    expect(barRender).toBe(1);

    act(() => {
      useStore.setState({ foo: 3 });
    });
    expect(screen.getByText('full: 3-7')).toBeInTheDocument();
    expect(screen.getByText('foo: 3')).toBeInTheDocument();
    expect(screen.getByText('bar: 7')).toBeInTheDocument();

    expect(fullRender).toBe(2);
    expect(fooRender).toBe(2);
    expect(barRender).toBe(1);
  });
});
