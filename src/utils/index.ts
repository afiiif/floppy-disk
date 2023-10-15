export const noop = () => {};
export const identityFn = <T>(value: T) => value;
export const hasValue = (value: any) => value !== undefined && value !== null;

export const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort());

export const getValue = <T, P extends any[]>(
  valueOrComputeValueFn: T | ((...params: P) => T),
  ...params: P
) => {
  if (typeof valueOrComputeValueFn === 'function') {
    return (valueOrComputeValueFn as (...params: P) => T)(...params);
  }
  return valueOrComputeValueFn;
};

export type Maybe<T> = T | null | undefined;

export const isClient = typeof window !== 'undefined' && !('Deno' in window);

export const createError = (message: string, props: Record<string, any>) => {
  const error = Object.assign(new Error(message), props);
  return error;
};
