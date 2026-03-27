import { type InitStoreOptions, type StoreApi, getHash, initStore } from '../vanilla.ts';
import { useStoreState } from './use-store.ts';

/**
 * Creates a factory for multiple stores identified by a key.
 *
 * @param initialState - The initial state for each store instance
 * @param options - Optional lifecycle hooks
 *
 * @returns A function to retrieve or create a store by key
 *
 * @remarks
 * - Each unique key maps to a separate store instance.
 * - Keys are deterministically hashed, ensuring stable identity.
 * - Stores are lazily created and cached.
 * - Each store has its own state, subscribers, and lifecycle.
 * - Useful for scenarios like:
 *   - Query caches
 *   - Entity-based state
 *   - Dynamic instances
 *
 * @example
 * const getUserStore = createStores({ name: '' });
 *
 * const userStore = getUserStore({ id: 1 });
 * const name = userStore((s) => s.name);
 */
export const createStores = <TState extends Record<string, any>, TKey extends Record<string, any>>(
  initialState: TState,
  options?: InitStoreOptions<TState>,
) => {
  const stores = new Map<string, StoreApi<TState>>();

  const getStore = (key: TKey = {} as TKey) => {
    const keyHash = getHash(key);

    let store: StoreApi<TState>;
    if (stores.has(keyHash)) {
      store = stores.get(keyHash)!;
    } else {
      store = initStore(initialState, options);
      stores.set(keyHash, store);
    }

    const useStore = <TStateSlice = TState>(selector?: (state: TState) => TStateSlice) => {
      return useStoreState(store, selector);
    };

    return Object.assign(useStore, {
      ...store,
      delete: () => {
        if (store.getSubscribers().size > 0) {
          console.warn(
            'Cannot delete store while it still has active subscribers. Unsubscribe all listeners before deleting the store.',
          );
          return false;
        }
        store.setState(initialState);
        return stores.delete(keyHash);
      },
    });
  };

  return getStore;
};
