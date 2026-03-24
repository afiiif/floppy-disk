/* eslint-disable no-prototype-builtins */

const hasObjectPrototype = (value: any) => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

// Copied from: https://github.com/jonschlinkert/is-plain-object
export const isPlainObject = (value: any) => {
  if (!hasObjectPrototype(value)) return false;
  const ctor = value.constructor;
  if (typeof ctor === 'undefined') return true;
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) return false;
  if (!prot.hasOwnProperty('isPrototypeOf')) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return true;
};

/**
 * Get stable hash string from any value.
 *
 * Reference: https://github.com/TanStack/query/blob/v5.90.3/packages/query-core/src/utils.ts#L216
 */
export const getHash = (value?: any) =>
  JSON.stringify(value, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key];
            return result;
          }, {} as any)
      : val,
  );
