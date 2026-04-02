import { useMemo, useRef, useState } from 'react';
import { type StoreApi } from '../vanilla.ts';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.ts';

type Path = Array<string | number | symbol>;

export const getValueByPath = (obj: any, path: Path) => path.reduce((acc, key) => acc?.[key], obj);

export const isPrefixPath = (candidatePrefix: Path, targetPath: Path) => {
  if (candidatePrefix.length >= targetPath.length) return false;
  for (let i = 0; i < candidatePrefix.length; i++) {
    if (candidatePrefix[i] !== targetPath[i]) return false;
  }
  return true;
};

export const compressPaths = (paths: Path[]): Path[] => {
  const result: Path[] = [];
  let prev: Path | null = null;
  for (let i = paths.length - 1; i >= 0; i--) {
    const current = paths[i];
    if (!prev || !isPrefixPath(current, prev)) result.push(current);
    prev = current;
  }
  return result;
};

export const useStoreStateProxy = <TState extends Record<string, any>>(storeState: TState) => {
  const usedPathsRef = useRef<Path[]>([]);
  usedPathsRef.current = [];

  const trackedState = useMemo(() => {
    const track = (path: Path) => usedPathsRef.current.push(path);

    const proxyCache = new WeakMap();

    const createDeepProxy = <T>(target: T, path: Path = []): T => {
      if (typeof target !== 'object' || target === null) {
        return target;
      }
      if (proxyCache.has(target)) {
        return proxyCache.get(target);
      }
      const proxy = new Proxy(target, {
        get(obj: any, key) {
          const newPath = [...path, key];
          track(newPath);
          const value = obj[key];
          return createDeepProxy(value, newPath);
        },
      });
      proxyCache.set(target, proxy);
      return proxy;
    };

    return createDeepProxy(storeState);
  }, [storeState]);

  return [trackedState, usedPathsRef] as const;
};

export const NO_INITIAL_VALUE = {};

export const useStoreStateWithInitializer = <TState extends Record<string, any>>(
  store: StoreApi<TState>,
  initialState = NO_INITIAL_VALUE as Partial<TState>,
) => {
  const initiatedAt = useRef(new WeakMap([[store, 0]]));
  useIsomorphicLayoutEffect(() => {
    if (initialState === NO_INITIAL_VALUE || initiatedAt.current.get(store)) return;
    store.setState(initialState);
    initiatedAt.current.set(store, Date.now());
  }, [store, initialState]);

  const storeState = store.getState();

  const finalState =
    initialState === NO_INITIAL_VALUE || initiatedAt.current.get(store)
      ? storeState
      : { ...storeState, ...initialState };

  return [finalState, initiatedAt] as const;
};

/**
 * React hook for subscribing to a store using automatic dependency tracking.
 *
 * @param store - The store instance to subscribe to
 * @param options - Optional configuration
 * @param options.initialState - Initial state used on first render (and will also update the store state right after that)
 *
 * @returns A proxied version of the store state
 *
 * @remarks
 * - This hook uses a **Proxy-based tracking mechanism** to detect which parts of the state are accessed during render.
 * - The component will only re-render when the **accessed values actually change**.
 * - State must be treated as **immutable**:
 *   - Updates must replace objects rather than mutate them
 *   - Otherwise, changes may not be detected
 * - If provided, `initialState` will be applied **once per store instance**
 *
 * @example
 * const state = useStoreState(store);
 * return <div>{state.user.name}</div>;
 * // Component will only re-render if `user.name` changes
 */
export const useStoreState = <TState extends Record<string, any>>(
  store: StoreApi<TState>,
  options: { initialState?: Partial<TState> } = {},
): TState => {
  const [state] = useStoreStateWithInitializer(store, options.initialState);

  const [trackedState, usedPathsRef] = useStoreStateProxy(state);

  const [, reRender] = useState({});

  useIsomorphicLayoutEffect(() => {
    return store.subscribe((nextState, prevState, changedKeys) => {
      const paths = compressPaths(usedPathsRef.current);
      for (const path of paths) {
        const rootKey = path[0] as keyof TState;
        if (!changedKeys.includes(rootKey)) continue;
        const prevVal = getValueByPath(prevState, path);
        const nextVal = getValueByPath(nextState, path);
        if (!Object.is(prevVal, nextVal)) return reRender({});
      }
    });
  }, [store]);

  return trackedState;
};
