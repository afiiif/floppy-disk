import { type InitStoreOptions, type StoreApi, getHash, initStore } from "../vanilla.ts";
import { useStoreState } from "./use-store.ts";

type GoodInputForHash = string | number | boolean | null | Date;
export type StoreKey = GoodInputForHash | { [key: string | number]: StoreKey | StoreKey[] };

type AdditionalStoreApi<TKey> = {
  /**
   * The original key used to identify this store instance.\
   * This value is not hashed and is preserved as-is.
   */
  key: TKey;

  /**
   * A deterministic hash string derived from {@link key}.
   *
   * Used internally as the unique identifier for caching and retrieving store instances.
   *
   * @remarks
   * - Guarantees that structurally identical keys produce the same hash.
   */
  keyHash: string;

  /**
   * Deletes this store instance from the internal cache.
   *
   * @returns `true` if the store was successfully deleted, otherwise `false`.
   *
   * @remarks
   * - If there are active subscribers, the deletion is ignored and `false` is returned.
   * - When deletion succeeds:
   *   - The store is removed from the cache.
   *   - Its state is reset to the initial state.
   * - Intended for manual cleanup of unused or ephemeral stores.
   */
  delete: () => boolean;
};

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
 * - Each returned store includes:
 *   - React hook (with Proxy-based tracking)
 *   - Store API methods
 *   - `delete()` for manual cleanup
 * - Useful for scenarios like:
 *   - Query caches
 *   - Entity-based state
 *   - Dynamic instances
 *
 * @example
 * const userStore = createStores<{ name: string }, { id: number }>({ name: '' });
 *
 * function Component() {
 *   const useUserStore = userStore({ id: 1 });
 *   const state = useUserStore();
 *   return <div>{state.name}</div>;
 * }
 *
 * @see https://floppy-disk.vercel.app/docs/stores
 */
export const createStores = <TState extends Record<string, any>, TKey extends StoreKey>(
  initialState: TState,
  options?: InitStoreOptions<TState, AdditionalStoreApi<TKey>>,
) => {
  type TStore = StoreApi<TState> & AdditionalStoreApi<TKey>;
  const stores = new Map<string, TStore>();

  const getStore = (key: TKey = {} as TKey) => {
    const keyHash = getHash(key);
    let store: TStore;

    if (stores.has(keyHash)) {
      store = stores.get(keyHash)!;
    } else {
      store = initStore(
        initialState,
        options as any, // Intentionally using as any: don't want to add generic on `initStore`
      ) as TStore;
      store.key = key;
      store.keyHash = keyHash;
      stores.set(keyHash, store);

      store.delete = () => {
        if (store.getSubscriberCount() > 0) {
          console.warn(
            "Cannot delete store while it still has active subscribers. Unsubscribe all listeners before deleting the store.",
          );
          return false;
        }
        store.setState(initialState);
        return stores.delete(keyHash);
      };
    }

    const useStore = (options?: {
      /**
       * Initial state used on first render (and will also update the store state right after that)
       *
       *  If provided, `initialState` will be applied **once per store instance**
       */
      initialState?: Partial<TState>;
    }) => useStoreState(store, options);

    return Object.assign(useStore, store);
  };

  return getStore;
};
