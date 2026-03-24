import { type InitStoreOptions, type StoreApi, getHash, initStore } from '../vanilla.ts';
import { useStoreState } from './use-store.ts';

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
