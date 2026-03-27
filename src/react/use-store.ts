import { useRef, useState } from 'react';
import { type StoreApi, identity, shallow } from 'floppy-disk';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.ts';

export const useStoreUpdateNotifier = <TState extends Record<string, any>, TStateSlice = TState>(
  store: StoreApi<TState>,
  selector: (state: TState) => TStateSlice,
) => {
  const [, reRender] = useState({});

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  useIsomorphicLayoutEffect(
    () =>
      store.subscribe((state, prevState) => {
        if (selectorRef.current === identity) return reRender({});
        const prevSlice = selectorRef.current(prevState);
        const nextSlice = selectorRef.current(state);
        if (!shallow(prevSlice, nextSlice)) reRender({});
      }),
    [store],
  );
};

/**
 * React hook for subscribing to a store with optional state selection.
 *
 * @param store - The store instance to subscribe to
 * @param selector - Optional selector to derive a slice of state
 *
 * @returns The selected state slice (or full state if no selector is provided)
 *
 * @remarks
 * - The selector does **not** need to be memoized.
 * - The hook internally keeps the latest selector reference to avoid re-subscription.
 *
 * @example
 * const count = useStoreState(store, (s) => s.count);
 */
export const useStoreState = <TState extends Record<string, any>, TStateSlice = TState>(
  store: StoreApi<TState>,
  selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
) => {
  useStoreUpdateNotifier(store, selector);
  return selector(store.getState());
};
