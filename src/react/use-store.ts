import { useRef, useState } from 'react';
import { type StoreApi, identity, shallow } from '../vanilla.ts';
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

export const useStoreState = <TState extends Record<string, any>, TStateSlice = TState>(
  store: StoreApi<TState>,
  selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
) => {
  useStoreUpdateNotifier(store, selector);
  return selector(store.getState());
};
