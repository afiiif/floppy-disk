/**
 * Shallow compare 2 values.
 *
 * Reference: https://github.com/pmndrs/zustand/blob/e414f7ccf41eae09517ee2dcb44c9f5ae8a35a25/src/vanilla/shallow.ts
 */
export const shallow = <T>(a: T, b: T) => {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;

    for (const [key, value] of a) {
      if (!Object.is(value, b.get(key))) {
        return false;
      }
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;

    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }

  const keysA = Object.keys(a) as (keyof T)[];
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(b, keysA[i]) ||
      !Object.is(a[keysA[i]], b[keysA[i]])
    ) {
      return false;
    }
  }
  return true;
};
