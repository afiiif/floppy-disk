import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createStores } from 'floppy-disk/react';

describe('createStores', () => {
  it('returns same underlying store for same key', () => {
    const getStore = createStores({ foo: 0 });
    const storeA = getStore({ id: 1 });
    const storeB = getStore({ id: 1 });

    storeA.setState({ foo: 1 });
    expect(storeB.getState().foo).toBe(1);
    expect(storeA.setState).toBe(storeB.setState);
    expect(storeA.getSubscribers).toBe(storeB.getSubscribers);
  });

  it('isolates state between stores', () => {
    const getStore = createStores({ foo: 0 });
    const storeA = getStore({ id: 1 });
    const storeB = getStore({ id: 2 });

    act(() => {
      storeA.setState({ foo: 1 });
    });
    expect(storeA.getState().foo).toBe(1);
    expect(storeB.getState().foo).toBe(0);
  });
});
