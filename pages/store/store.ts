import { createStore } from '../../src';

export const useCountStore = createStore<{ count: number; inc: () => void }>(({ set }) => ({
  count: 1,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));
