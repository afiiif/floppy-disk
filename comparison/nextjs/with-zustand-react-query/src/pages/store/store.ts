import { create } from 'zustand';

export const useCountStore = create<{ count: number; inc: () => void }>((set) => ({
  count: 1,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));
